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
import { TabList, tabButtonId, tabPanelId, type TabItem } from "@/components/Tabs";
import { StubPanel } from "@/components/StubPanel";
import type { Analysis, ClauseType, RiskLevel } from "@/lib/schemas";

type TabId = "clauses" | "ask" | "compare" | "brief";

const TABS: TabItem[] = [
  { id: "clauses", label: "Clauses" },
  { id: "ask", label: "Ask" },
  { id: "compare", label: "Compare" },
  { id: "brief", label: "Brief" },
];

interface ApiErrorInfo {
  code: string;
  message: string;
}

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
}

type AppAction =
  | { type: "UPLOAD_START"; file: File }
  | { type: "UPLOAD_SUCCESS"; analysis: Analysis; documentText: string }
  | { type: "UPLOAD_ERROR"; error: ApiErrorInfo }
  | { type: "RESET" }
  | { type: "SELECT_CLAUSE"; id: string }
  | { type: "SET_TAB"; tab: TabId }
  | { type: "SET_RISK_FILTER"; value: RiskLevel | "all" }
  | { type: "SET_TYPE_FILTER"; value: ClauseType | "all" };

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
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "UPLOAD_START":
      return { ...initialState, status: "loading", lastFile: action.file };
    case "UPLOAD_SUCCESS":
      return {
        ...state,
        status: "success",
        analysis: action.analysis,
        documentText: action.documentText,
        error: null,
        selectedClauseId: null,
        activeTab: "clauses",
      };
    case "UPLOAD_ERROR":
      return { ...state, status: "error", error: action.error };
    case "RESET":
      return initialState;
    case "SELECT_CLAUSE":
      return { ...state, selectedClauseId: action.id, activeTab: "clauses" };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_RISK_FILTER":
      return { ...state, riskFilter: action.value };
    case "SET_TYPE_FILTER":
      return { ...state, typeFilter: action.value };
    default:
      return state;
  }
}

async function submitFile(file: File, dispatch: Dispatch<AppAction>) {
  dispatch({ type: "UPLOAD_START", file });

  const formData = new FormData();
  formData.append("file", file);

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

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleFileSelected = useCallback((file: File) => {
    void submitFile(file, dispatch);
  }, []);

  const handleRetry = useCallback(() => {
    if (state.lastFile) void submitFile(state.lastFile, dispatch);
  }, [state.lastFile]);

  const handleStartOver = useCallback(() => dispatch({ type: "RESET" }), []);

  const handleSelectClause = useCallback(
    (id: string) => dispatch({ type: "SELECT_CLAUSE", id }),
    [],
  );

  return (
    <>
      <Header />
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {state.status === "idle" && (
          <div className="grid items-center gap-10 py-10 lg:grid-cols-2 lg:gap-16 lg:py-16">
            <div className="text-center lg:text-left">
              <h1 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
                Know what you&apos;re signing before you sign it.
              </h1>
              <p className="mx-auto mt-4 max-w-md text-base text-ink-soft lg:mx-0">
                Upload a contract and Clause Compass maps every clause: what it means, what it
                asks of you, and how risky it is — all grounded in quotes from your own document.
              </p>
              <div className="mt-8 flex justify-center lg:justify-start">
                <UploadZone onFileSelected={handleFileSelected} />
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
                  clauses={state.analysis.clauses}
                  selectedClauseId={state.selectedClauseId}
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
                <StubPanel
                  title="Ask isn't built yet"
                  description="Soon you'll be able to ask what happens if you break a clause, and get a cited answer."
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
                <StubPanel
                  title="Compare isn't built yet"
                  description="Soon you'll be able to compare this document against a second one or a fair baseline."
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
                <StubPanel
                  title="Brief isn't built yet"
                  description="Soon you'll get a printable one-pager: risks, questions for a lawyer, and a checklist."
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
