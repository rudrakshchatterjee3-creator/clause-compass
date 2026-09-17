"use client";

import { useCallback, useReducer, type Dispatch } from "react";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { HeroIllustration } from "@/components/HeroIllustration";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { SummaryCard } from "@/components/SummaryCard";
import { ClauseList } from "@/components/ClauseList";
import { DocumentPane } from "@/components/DocumentPane";
import { AskPanel } from "@/components/AskPanel";
import { ComparePanel } from "@/components/ComparePanel";
import { BriefPanel } from "@/components/BriefPanel";
import { PiiToggle } from "@/components/PiiToggle";
import { RedactionNotice } from "@/components/RedactionNotice";
import { TabList, tabButtonId, tabPanelId, type TabItem } from "@/components/Tabs";
import type { ApiErrorInfo, AskTurn, RedactionSummaryDto } from "@/components/askTypes";
import type { AskStreamEvent } from "@/lib/schemas/api";
import { parseNdjsonStream } from "@/lib/streaming/ndjson";
import type { Analysis, Brief, ClauseType, Comparison, RiskLevel } from "@/lib/schemas";

type TabId = "clauses" | "ask" | "compare" | "brief";

const TABS: TabItem[] = [
  { id: "clauses", label: "Clauses" },
  { id: "ask", label: "Ask" },
  { id: "compare", label: "Compare" },
  { id: "brief", label: "Brief" },
];

const MAX_ASK_HISTORY_TURNS = 4;

interface AppState {
  status: "idle" | "loading" | "success" | "error";
  analysis: Analysis | null;
  documentText: string | null;
  error: ApiErrorInfo | null;
  activeTab: TabId;
  selectedClauseId: string | null;
  riskFilter: RiskLevel | "all";
  typeFilter: ClauseType | "all";
  lastFile: File | null;
  askTurns: AskTurn[];
  askQuestion: string;
  askSelectedStepId: string | null;
  compareStatus: "idle" | "loading" | "success" | "error";
  compareComparison: Comparison | null;
  compareDocBLabel: string | null;
  compareError: ApiErrorInfo | null;
  compareOnlyChanges: boolean;
  compareLastRequest: { file?: File; baselineId?: string; label: string } | null;
  briefStatus: "idle" | "loading" | "success" | "error";
  brief: Brief | null;
  briefGeneratedAt: string | null;
  briefError: ApiErrorInfo | null;
  redactPii: boolean;
  analysisRedactions: RedactionSummaryDto[];
  compareRedactions: RedactionSummaryDto[];
}

type AppAction =
  | { type: "UPLOAD_START"; file: File }
  | {
      type: "UPLOAD_SUCCESS";
      analysis: Analysis;
      documentText: string;
      redactions: RedactionSummaryDto[];
    }
  | { type: "UPLOAD_ERROR"; error: ApiErrorInfo }
  | { type: "RESET" }
  | { type: "SET_REDACT_PII"; value: boolean }
  | { type: "SELECT_CLAUSE"; id: string }
  | { type: "SET_TAB"; tab: TabId }
  | { type: "SET_RISK_FILTER"; value: RiskLevel | "all" }
  | { type: "SET_TYPE_FILTER"; value: ClauseType | "all" }
  | { type: "ASK_SET_QUESTION"; value: string }
  | { type: "ASK_SUBMIT"; id: string; question: string }
  | { type: "ASK_CHUNK"; id: string; text: string }
  | { type: "ASK_RESULT"; id: string; result: AskTurn["result"] }
  | { type: "ASK_ERROR"; id: string; error: ApiErrorInfo }
  | { type: "ASK_REDACTIONS"; id: string; redactions: RedactionSummaryDto[] }
  | { type: "ASK_SELECT_STEP"; id: string }
  | { type: "COMPARE_START"; request: { file?: File; baselineId?: string; label: string } }
  | { type: "COMPARE_SUCCESS"; comparison: Comparison; redactions: RedactionSummaryDto[] }
  | { type: "COMPARE_ERROR"; error: ApiErrorInfo }
  | { type: "COMPARE_TOGGLE_ONLY_CHANGES" }
  | { type: "COMPARE_RESET" }
  | { type: "BRIEF_START" }
  | { type: "BRIEF_SUCCESS"; brief: Brief; generatedAt: string }
  | { type: "BRIEF_ERROR"; error: ApiErrorInfo };

const initialState: AppState = {
  status: "idle",
  analysis: null,
  documentText: null,
  error: null,
  activeTab: "clauses",
  selectedClauseId: null,
  riskFilter: "all",
  typeFilter: "all",
  lastFile: null,
  askTurns: [],
  askQuestion: "",
  askSelectedStepId: null,
  compareStatus: "idle",
  compareComparison: null,
  compareDocBLabel: null,
  compareError: null,
  compareOnlyChanges: false,
  compareLastRequest: null,
  briefStatus: "idle",
  brief: null,
  briefGeneratedAt: null,
  briefError: null,
  redactPii: true,
  analysisRedactions: [],
  compareRedactions: [],
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "UPLOAD_START":
      return {
        ...initialState,
        status: "loading",
        lastFile: action.file,
        redactPii: state.redactPii,
      };
    case "UPLOAD_SUCCESS":
      return {
        ...state,
        status: "success",
        analysis: action.analysis,
        documentText: action.documentText,
        analysisRedactions: action.redactions,
        error: null,
        selectedClauseId: null,
        activeTab: "clauses",
      };
    case "UPLOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "RESET":
      return { ...initialState, redactPii: state.redactPii };
    case "SET_REDACT_PII":
      return { ...state, redactPii: action.value };
    case "SELECT_CLAUSE":
      return { ...state, selectedClauseId: action.id, activeTab: "clauses" };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_RISK_FILTER":
      return { ...state, riskFilter: action.value };
    case "SET_TYPE_FILTER":
      return { ...state, typeFilter: action.value };
    case "ASK_SET_QUESTION":
      return { ...state, askQuestion: action.value };
    case "ASK_SUBMIT":
      return {
        ...state,
        askQuestion: "",
        askSelectedStepId: null,
        askTurns: [
          ...state.askTurns,
          {
            id: action.id,
            question: action.question,
            answer: "",
            result: null,
            status: "streaming",
            error: null,
            redactions: [],
          },
        ],
      };
    case "ASK_CHUNK":
      return {
        ...state,
        askTurns: state.askTurns.map((turn) =>
          turn.id === action.id ? { ...turn, answer: turn.answer + action.text } : turn,
        ),
      };
    case "ASK_RESULT":
      return {
        ...state,
        askTurns: state.askTurns.map((turn) =>
          turn.id === action.id ? { ...turn, result: action.result, status: "done" } : turn,
        ),
      };
    case "ASK_ERROR":
      return {
        ...state,
        askTurns: state.askTurns.map((turn) =>
          turn.id === action.id ? { ...turn, status: "error", error: action.error } : turn,
        ),
      };
    case "ASK_REDACTIONS":
      return {
        ...state,
        askTurns: state.askTurns.map((turn) =>
          turn.id === action.id ? { ...turn, redactions: action.redactions } : turn,
        ),
      };
    case "ASK_SELECT_STEP":
      return { ...state, askSelectedStepId: action.id };
    case "COMPARE_START":
      return {
        ...state,
        compareStatus: "loading",
        compareError: null,
        compareLastRequest: action.request,
      };
    case "COMPARE_SUCCESS":
      return {
        ...state,
        compareStatus: "success",
        compareComparison: action.comparison,
        compareRedactions: action.redactions,
        compareDocBLabel: state.compareLastRequest?.label ?? null,
      };
    case "COMPARE_ERROR":
      return { ...state, compareStatus: "error", compareError: action.error };
    case "COMPARE_TOGGLE_ONLY_CHANGES":
      return { ...state, compareOnlyChanges: !state.compareOnlyChanges };
    case "COMPARE_RESET":
      return {
        ...state,
        compareStatus: "idle",
        compareComparison: null,
        compareDocBLabel: null,
        compareError: null,
        compareLastRequest: null,
        compareRedactions: [],
      };
    case "BRIEF_START":
      return { ...state, briefStatus: "loading", briefError: null };
    case "BRIEF_SUCCESS":
      return {
        ...state,
        briefStatus: "success",
        brief: action.brief,
        briefGeneratedAt: action.generatedAt,
      };
    case "BRIEF_ERROR":
      return { ...state, briefStatus: "error", briefError: action.error };
    default:
      return state;
  }
}

async function submitFile(file: File, redactPii: boolean, dispatch: Dispatch<AppAction>) {
  dispatch({ type: "UPLOAD_START", file });

  const formData = new FormData();
  formData.append("file", file);
  if (!redactPii) formData.append("redactPii", "false");

  try {
    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const body = await response.json();

    if (!response.ok) {
      dispatch({
        type: "UPLOAD_ERROR",
        error: body?.error ?? {
          code: "unknown",
          message: "Something went wrong. Please try again.",
        },
      });
      return;
    }

    dispatch({
      type: "UPLOAD_SUCCESS",
      analysis: body.analysis,
      documentText: body.documentText,
      redactions: body.redactions ?? [],
    });
  } catch {
    dispatch({
      type: "UPLOAD_ERROR",
      error: {
        code: "network_error",
        message: "Could not reach the server. Check your connection and try again.",
      },
    });
  }
}

async function submitQuestion(
  params: {
    documentText: string;
    question: string;
    history: { question: string; answer: string }[];
    redactPii: boolean;
  },
  dispatch: Dispatch<AppAction>,
) {
  const id = crypto.randomUUID();
  dispatch({ type: "ASK_SUBMIT", id, question: params.question });

  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentText: params.documentText,
        question: params.question,
        history: params.history,
        redactPii: params.redactPii,
      }),
    });

    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => null);
      dispatch({
        type: "ASK_ERROR",
        id,
        error: body?.error ?? { code: "unknown", message: "Something went wrong. Please try again." },
      });
      return;
    }

    for await (const raw of parseNdjsonStream(response.body)) {
      const event = raw as AskStreamEvent;
      if (event.type === "answer_chunk") {
        dispatch({ type: "ASK_CHUNK", id, text: event.text });
      } else if (event.type === "result") {
        dispatch({ type: "ASK_RESULT", id, result: event.result });
      } else if (event.type === "error") {
        dispatch({ type: "ASK_ERROR", id, error: event.error });
      } else if (event.type === "redactions") {
        dispatch({ type: "ASK_REDACTIONS", id, redactions: event.redactions });
      }
    }
  } catch {
    dispatch({
      type: "ASK_ERROR",
      id,
      error: {
        code: "network_error",
        message: "Could not reach the server. Check your connection and try again.",
      },
    });
  }
}

async function submitCompare(
  params: {
    documentTextA: string;
    file?: File;
    baselineId?: string;
    label: string;
    redactPii: boolean;
  },
  dispatch: Dispatch<AppAction>,
) {
  dispatch({
    type: "COMPARE_START",
    request: { file: params.file, baselineId: params.baselineId, label: params.label },
  });

  const formData = new FormData();
  formData.append("documentTextA", params.documentTextA);
  if (params.baselineId) formData.append("baselineId", params.baselineId);
  if (params.file) formData.append("fileB", params.file);
  if (!params.redactPii) formData.append("redactPii", "false");

  try {
    const response = await fetch("/api/compare", { method: "POST", body: formData });
    const body = await response.json();

    if (!response.ok) {
      dispatch({
        type: "COMPARE_ERROR",
        error: body?.error ?? {
          code: "unknown",
          message: "Something went wrong. Please try again.",
        },
      });
      return;
    }

    dispatch({
      type: "COMPARE_SUCCESS",
      comparison: body.comparison,
      redactions: body.redactions ?? [],
    });
  } catch {
    dispatch({
      type: "COMPARE_ERROR",
      error: {
        code: "network_error",
        message: "Could not reach the server. Check your connection and try again.",
      },
    });
  }
}

async function submitBrief(
  params: { analysis: Analysis; qaHistory: { question: string; answer: string }[] },
  dispatch: Dispatch<AppAction>,
) {
  dispatch({ type: "BRIEF_START" });

  try {
    const response = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: params.analysis, qaHistory: params.qaHistory }),
    });
    const body = await response.json();

    if (!response.ok) {
      dispatch({
        type: "BRIEF_ERROR",
        error: body?.error ?? {
          code: "unknown",
          message: "Something went wrong. Please try again.",
        },
      });
      return;
    }

    dispatch({ type: "BRIEF_SUCCESS", brief: body.brief, generatedAt: body.generatedAt });
  } catch {
    dispatch({
      type: "BRIEF_ERROR",
      error: {
        code: "network_error",
        message: "Could not reach the server. Check your connection and try again.",
      },
    });
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleFileSelected = useCallback(
    (file: File) => {
      void submitFile(file, state.redactPii, dispatch);
    },
    [state.redactPii],
  );

  const handleRetry = useCallback(() => {
    if (state.lastFile) void submitFile(state.lastFile, state.redactPii, dispatch);
  }, [state.lastFile, state.redactPii]);

  const handleStartOver = useCallback(() => dispatch({ type: "RESET" }), []);

  const handleToggleRedactPii = useCallback(
    (value: boolean) => dispatch({ type: "SET_REDACT_PII", value }),
    [],
  );

  const handleSelectClause = useCallback(
    (id: string) => dispatch({ type: "SELECT_CLAUSE", id }),
    [],
  );

  const handleAskQuestionChange = useCallback(
    (value: string) => dispatch({ type: "ASK_SET_QUESTION", value }),
    [],
  );

  const handleAskSubmit = useCallback(
    (question: string) => {
      if (!state.documentText) return;
      const history = state.askTurns
        .filter((turn) => turn.status === "done")
        .slice(-MAX_ASK_HISTORY_TURNS)
        .map((turn) => ({ question: turn.question, answer: turn.answer }));
      void submitQuestion(
        { documentText: state.documentText, question, history, redactPii: state.redactPii },
        dispatch,
      );
    },
    [state.documentText, state.askTurns, state.redactPii],
  );

  const handleSelectStep = useCallback(
    (id: string) => dispatch({ type: "ASK_SELECT_STEP", id }),
    [],
  );

  const handleComparePickFile = useCallback(
    (file: File) => {
      if (!state.documentText) return;
      void submitCompare(
        { documentTextA: state.documentText, file, label: file.name, redactPii: state.redactPii },
        dispatch,
      );
    },
    [state.documentText, state.redactPii],
  );

  const handleComparePickBaseline = useCallback(
    (baselineId: string, label: string) => {
      if (!state.documentText) return;
      void submitCompare(
        { documentTextA: state.documentText, baselineId, label, redactPii: state.redactPii },
        dispatch,
      );
    },
    [state.documentText, state.redactPii],
  );

  const handleCompareRetry = useCallback(() => {
    if (!state.documentText || !state.compareLastRequest) return;
    void submitCompare(
      {
        documentTextA: state.documentText,
        file: state.compareLastRequest.file,
        baselineId: state.compareLastRequest.baselineId,
        label: state.compareLastRequest.label,
        redactPii: state.redactPii,
      },
      dispatch,
    );
  }, [state.documentText, state.compareLastRequest, state.redactPii]);

  const handleCompareReset = useCallback(() => dispatch({ type: "COMPARE_RESET" }), []);

  const handleCompareToggleOnlyChanges = useCallback(
    () => dispatch({ type: "COMPARE_TOGGLE_ONLY_CHANGES" }),
    [],
  );

  const handleGenerateBrief = useCallback(() => {
    if (!state.analysis) return;
    const qaHistory = state.askTurns
      .filter((turn) => turn.status === "done")
      .map((turn) => ({ question: turn.question, answer: turn.answer }));
    void submitBrief({ analysis: state.analysis, qaHistory }, dispatch);
  }, [state.analysis, state.askTurns]);

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {state.status === "idle" && (
          <div className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
            <div className="text-center lg:text-left">
              <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                Know what you&apos;re signing before you sign it.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base text-ink-soft lg:mx-0">
                Upload a contract and Clause Compass maps every clause: what it means, what it
                asks of you, and how risky it is — all grounded in quotes from your own document.
              </p>
              <div className="mt-8 flex flex-col items-center lg:items-start">
                <UploadZone onFileSelected={handleFileSelected} />
                <PiiToggle checked={state.redactPii} onChange={handleToggleRedactPii} />
              </div>
            </div>
            <div className="hidden lg:block">
              <HeroIllustration />
            </div>
          </div>
        )}

        {state.status === "loading" && <LoadingState />}

        {state.status === "error" && state.error && (
          <div className="py-10">
            <ErrorState
              message={state.error.message}
              onRetry={state.lastFile ? handleRetry : undefined}
              onStartOver={handleStartOver}
            />
          </div>
        )}

        {state.status === "success" && state.analysis && state.documentText && (
          <div className="space-y-6 py-6">
            <SummaryCard
              docTitle={state.analysis.docTitle}
              parties={state.analysis.parties}
              summary={state.analysis.summary}
              missingCommonClauses={state.analysis.missingCommonClauses}
            />

            {state.analysisRedactions.length > 0 && (
              <RedactionNotice redactions={state.analysisRedactions} />
            )}

            <div>
              <TabList
                tabs={TABS}
                activeTab={state.activeTab}
                onChange={(tab) => dispatch({ type: "SET_TAB", tab: tab as TabId })}
                label="Document views"
              />

              <div
                role="tabpanel"
                id={tabPanelId("clauses")}
                aria-labelledby={tabButtonId("clauses")}
                hidden={state.activeTab !== "clauses"}
                tabIndex={0}
                className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,380px)_1fr]"
              >
                <ClauseList
                  clauses={state.analysis.clauses}
                  selectedClauseId={state.selectedClauseId}
                  onSelect={handleSelectClause}
                  riskFilter={state.riskFilter}
                  typeFilter={state.typeFilter}
                  onRiskFilterChange={(value) => dispatch({ type: "SET_RISK_FILTER", value })}
                  onTypeFilterChange={(value) => dispatch({ type: "SET_TYPE_FILTER", value })}
                />
                <DocumentPane
                  text={state.documentText}
                  spans={state.analysis.clauses}
                  selectedId={state.selectedClauseId}
                  onSelect={handleSelectClause}
                />
              </div>

              <div
                role="tabpanel"
                id={tabPanelId("ask")}
                aria-labelledby={tabButtonId("ask")}
                hidden={state.activeTab !== "ask"}
                tabIndex={0}
                className="pt-6"
              >
                <AskPanel
                  documentText={state.documentText}
                  clauses={state.analysis.clauses}
                  turns={state.askTurns}
                  question={state.askQuestion}
                  onQuestionChange={handleAskQuestionChange}
                  onSubmit={handleAskSubmit}
                  selectedStepId={state.askSelectedStepId}
                  onSelectStep={handleSelectStep}
                />
              </div>

              <div
                role="tabpanel"
                id={tabPanelId("compare")}
                aria-labelledby={tabButtonId("compare")}
                hidden={state.activeTab !== "compare"}
                tabIndex={0}
                className="pt-6"
              >
                <ComparePanel
                  status={state.compareStatus}
                  comparison={state.compareComparison}
                  docBLabel={state.compareDocBLabel}
                  redactions={state.compareRedactions}
                  error={state.compareError}
                  onlyChanges={state.compareOnlyChanges}
                  onToggleOnlyChanges={handleCompareToggleOnlyChanges}
                  onPickFile={handleComparePickFile}
                  onPickBaseline={handleComparePickBaseline}
                  onRetry={handleCompareRetry}
                  onReset={handleCompareReset}
                />
              </div>

              <div
                role="tabpanel"
                id={tabPanelId("brief")}
                aria-labelledby={tabButtonId("brief")}
                hidden={state.activeTab !== "brief"}
                tabIndex={0}
                className="pt-6"
              >
                <BriefPanel
                  status={state.briefStatus}
                  brief={state.brief}
                  generatedAt={state.briefGeneratedAt}
                  docTitle={state.analysis.docTitle}
                  disclaimer={state.analysis.disclaimer}
                  error={state.briefError}
                  onGenerate={handleGenerateBrief}
                  onRetry={handleGenerateBrief}
                />
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="border-t border-line bg-paper-raised py-6 text-center text-xs text-ink-soft">
        Clause Compass reads documents entirely per request — nothing you upload is stored.
      </footer>
    </>
  );
}
