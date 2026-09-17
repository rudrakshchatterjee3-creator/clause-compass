import type { Page } from "@playwright/test";

const RENT_QUOTE = "Tenant shall pay $1,850.00 per month, due on the 1st of each month.";
const LATE_FEE_QUOTE_LEAD = "A late fee of $175.00 will be charged for any rent received after the 3rd of the";

interface QuoteSpan {
  quote: string;
  start: number;
  end: number;
  verified: boolean;
}

/** Locates a (possibly whitespace-wrapped) quote in the real sample text, for realistic mocks. */
function findLateFeeQuote(documentText: string): QuoteSpan {
  const start = documentText.indexOf(LATE_FEE_QUOTE_LEAD);
  if (start === -1) return { quote: LATE_FEE_QUOTE_LEAD, start: 0, end: 0, verified: false };
  const monthIndex = documentText.indexOf("month.", start);
  const end = monthIndex === -1 ? start + LATE_FEE_QUOTE_LEAD.length : monthIndex + "month".length;
  return { quote: documentText.slice(start, end), start, end, verified: true };
}

function findRentQuote(documentText: string): QuoteSpan {
  const start = documentText.indexOf(RENT_QUOTE);
  if (start === -1) return { quote: RENT_QUOTE, start: 0, end: 0, verified: false };
  return { quote: RENT_QUOTE, start, end: start + RENT_QUOTE.length, verified: true };
}

function buildMockAnalysis(documentText: string) {
  const rent = findRentQuote(documentText);
  const lateFee = findLateFeeQuote(documentText);

  return {
    docTitle: "Residential Lease Agreement",
    parties: ["Harborview Properties LLC", "Jordan Ellis"],
    summary: "A month-to-month residential lease with a steep uncapped late fee.",
    clauses: [
      {
        id: "clause-rent",
        title: "Rent",
        type: "payment",
        quote: rent.quote,
        plainEnglish: "You pay $1,850 in rent on the 1st of every month.",
        obligations: [{ party: "Tenant", duty: "Pay rent", deadline: "1st of the month" }],
        risk: { level: "low", reason: "Standard, clearly stated payment term." },
        verified: rent.verified,
        start: rent.start,
        end: rent.end,
      },
      {
        id: "clause-late-fee",
        title: "Late Fees",
        type: "penalty",
        quote: lateFee.quote,
        plainEnglish: "Late rent costs $175 right away, plus $25 per extra day, with no cap.",
        obligations: [{ party: "Tenant", duty: "Pay any accrued late fees" }],
        risk: { level: "high", reason: "Uncapped daily fees can grow very large." },
        verified: lateFee.verified,
        start: lateFee.start,
        end: lateFee.end,
      },
    ],
    missingCommonClauses: ["Pet policy"],
    disclaimer:
      "This tool gives information, not legal advice. Always confirm important decisions with a licensed attorney.",
  };
}

function buildMockAskResult(documentText: string) {
  const lateFee = findLateFeeQuote(documentText);
  return {
    answerable: true,
    answer:
      "If you pay rent after the 3rd, you immediately owe a $175 late fee, plus $25 for every extra day.",
    steps: [
      {
        text: "The $175 late fee applies as soon as rent is received after the 3rd.",
        quote: lateFee.quote,
        verified: lateFee.verified,
        start: lateFee.start,
        end: lateFee.end,
      },
    ],
    confidence: "high",
    suggestLawyer: false,
  };
}

const BASELINE_TEXT =
  "FAIR BASELINE. A one-time late fee of $50.00 will be charged for any rent received after the 5th.";

function buildMockComparison(documentTextA: string) {
  const lateFee = findLateFeeQuote(documentTextA);
  const baselineQuote = "A one-time late fee of $50.00 will be charged for any rent received after the 5th.";

  return {
    items: [
      {
        topic: "Late fee",
        status: "changed",
        docA: {
          quote: lateFee.quote,
          verified: lateFee.verified,
          start: lateFee.start,
          end: lateFee.end,
        },
        docB: {
          quote: baselineQuote,
          verified: true,
          start: BASELINE_TEXT.indexOf(baselineQuote),
          end: BASELINE_TEXT.indexOf(baselineQuote) + baselineQuote.length,
        },
        explanation: "Your document charges a much steeper, uncapped late fee.",
        favours: "B",
      },
    ],
    summary: "The baseline caps the late fee; your document does not.",
  };
}

export const MOCK_BRIEF = {
  keyRisks: ["The late fee has no cap, so it can grow well beyond the rent owed."],
  questionsForLawyer: ["Is an uncapped daily late fee enforceable where I live?"],
  documentsToGather: ["Any past communication with the landlord about late payments"],
  deadlines: ["None found in the document"],
};

async function getSampleText(page: Page): Promise<string> {
  const response = await page.request.get("/samples/residential-lease.txt");
  return response.text();
}

export async function mockAnalyze(page: Page): Promise<void> {
  await page.route("**/api/analyze", async (route) => {
    const documentText = await getSampleText(page);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: buildMockAnalysis(documentText),
        documentText,
        redactions: [],
      }),
    });
  });
}

export async function mockAsk(page: Page): Promise<void> {
  await page.route("**/api/ask", async (route) => {
    const documentText = await getSampleText(page);
    const result = buildMockAskResult(documentText);
    const lines = [
      JSON.stringify({ type: "answer_chunk", text: result.answer }),
      JSON.stringify({ type: "result", result }),
    ];
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: `${lines.join("\n")}\n`,
    });
  });
}

export async function mockCompare(page: Page): Promise<void> {
  await page.route("**/api/compare", async (route) => {
    const postData = route.request().postData() ?? "";
    const match = /name="documentTextA"\r?\n\r?\n([\s\S]*?)\r?\n--/.exec(postData);
    const documentTextA = match?.[1] ?? (await getSampleText(page));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        comparison: buildMockComparison(documentTextA),
        documentTextA,
        documentTextB: BASELINE_TEXT,
        redactions: [],
      }),
    });
  });
}

export async function mockBrief(page: Page): Promise<void> {
  await page.route("**/api/brief", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ brief: MOCK_BRIEF, generatedAt: new Date().toISOString() }),
    });
  });
}
