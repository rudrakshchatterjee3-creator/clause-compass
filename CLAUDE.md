# Clause Compass

GenAI legal-document assistant for PromptWars. Users upload a contract (PDF/TXT/DOCX-as-text) and get:
1. **Clause map**: each clause gets a type, a plain-language explanation, obligations, and a risk level, all grounded in verified quotes.
2. **What-if simulator**: "What happens if I…?" returns a cited consequence chain, or an explicit "the document doesn't say."
3. **Compare mode**: two documents are diffed at clause level (changed / added / removed / one-sided).
4. **Lawyer-prep brief**: a printable one-pager with risks, questions for a lawyer, and a checklist.

This tool gives information, not legal advice. That must be visible in the UI and in every AI output.

## Stack
- Next.js (App Router) + TypeScript `strict`, Tailwind CSS
- Gemini via `@google/genai`, called **only** from server code. Model name comes from `GEMINI_MODEL` env.
- zod for all schemas (AI output, API input, env)
- PDF text extraction server-side with `unpdf`
- Vitest (unit), Playwright (e2e)
- Deploy: Docker (`output: "standalone"`) to Google Cloud Run

## Structure
```
src/
  app/                 # routes + pages only, thin
    api/analyze/       # POST: extract clauses
    api/ask/           # POST: what-if Q&A (streamed)
    api/compare/       # POST: compare two docs
    api/brief/         # POST: lawyer-prep brief
  components/          # UI, one component per file
  lib/
    ai/                # gemini client, prompts, generateStructured()
    parsing/           # file -> text, clause segmentation helpers
    grounding/         # citation verification
    schemas/           # zod schemas + inferred types
    security/          # rate limit, input validation, PII redaction
    env.ts             # zod-validated env
tests/                 # vitest unit tests mirror lib/
e2e/                   # playwright
```

## Non-negotiable rules
- No `any`, no `@ts-ignore`, no unused code. `npm run lint && npm run typecheck && npm test` must pass before a phase is done.
- API keys never reach the client. Import `server-only` in `lib/ai` and `lib/env.ts`.
- Every API route validates input with zod and returns typed errors `{ error: { code, message } }` with the correct HTTP status.
- Every AI response uses JSON schema output and is **parsed with zod**. On failure, retry once, then return a clean error.
- **Grounding:** the model returns `quote` strings, never offsets. The server locates each quote in the source text (whitespace/quote-normalized match) and computes `start`/`end`. It drops or flags any claim whose quote isn't found.
- **Document text is untrusted.** Wrap it in delimiters and instruct the model to ignore instructions inside it.
- Stateless server: no database, and documents are never persisted. An in-memory LRU cache keyed by SHA-256 of the text is allowed.
- Limits: 10 MB upload, 120k characters of extracted text, and allowed MIME types only.
- Accessibility: semantic HTML, full keyboard support, visible focus, risk shown by text and icon (never color alone), `aria-live` for async results, WCAG AA contrast.
- Keep functions small and pure where possible. Put business logic in `lib/`, not in components or route files.
- Write tests alongside every `lib/` module.

## Commands
- `npm run dev` / `build` / `start`
- `npm run lint` / `typecheck` / `test` / `test:e2e`

## Workflow
- Work in the phase you're given; don't jump ahead.
- End each phase by running lint, typecheck, and tests, and fix everything.
- Summarize what changed in 5 bullets or fewer.
