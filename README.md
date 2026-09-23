# Finance Advisor

A working TanStack Start + React + TypeScript financial workspace built from the supplied MASTER PROMPT and project report. All amounts use integer paise. Server-side financial, risk and recommendation engines supply the dashboard, invoice workflow, cash flow, budgets and advisor.

## Run the local demonstration

Requirements: Node.js 22.12+ (tested with Node 24), npm.

```bash
npm ci
cp .env.example .env
# Replace SESSION_SECRET in .env with the output of:
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
npm run dev
```

Open http://localhost:3000/auth and select **Open demo workspace**. Finance and Viewer demo accounts are also available. No account signup or cloud service is needed for this demo.

The demo is explicitly enabled with `DEMO_MODE=true`. It uses server-side JSON files under `.data/`, a signed HttpOnly session cookie, real domain calculations and real mutations. It is **not** PostgreSQL and must not hold real financial data or run as a production financial system. Each new demo session gets an isolated fictional company. Existing demo files remain on disk until deleted by the operator. Do not expose a public instance with unrestricted demo creation.

## Production build

```bash
npm run typecheck
npm test
npm run build
npm start
```

The bundled Node HTTP adapter serves the TanStack Start application and its static assets. No Python backend is used. Set `PORT` and `APP_ORIGIN` for your deployment. Use HTTPS in production; production cookies are Secure. For a local HTTP smoke test keep NODE_ENV unset or use the Vite development server.

## Hosted private demo — no Lovable required

This version can run on Sites with ChatGPT sign-in, a durable D1 demo ledger and private R2 document storage. Each signed-in Site user has one isolated fictional workspace that survives fresh browser sessions. Administrator, Finance and Viewer buttons are demo role simulations, not production role assignments. The Site remains owner-private.

The hosted entry point checks the platform identity on every request, binds its session to that identity, checks write origins and stores ledger updates with an optimistic revision check. The ledger and its audit events are saved in one atomic D1 update. Hosted demo snapshots are not the normalized PostgreSQL production database.

Use **Open demo workspace** to begin. Local use still works with `npm run dev`. `npm run build:site` produces the Worker; the ordinary `npm run build` and `npm start` retain the standalone Node application.

### Optional production services

1. Use an independent Supabase project for PostgreSQL, Auth and private Storage. Lovable is not required.
2. Apply `database/001_schema.sql`, then `database/002_members.sql` to a new database. It expects Supabase Auth and Storage schemas; do not apply it to an unrelated existing database.
3. Configure server-only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, a random `SESSION_SECRET`, and `DEMO_MODE=false`. Never prefix secrets with `VITE_`.
4. To enable external AI, set `AI_BASE_URL` to an OpenAI-compatible API base ending in `/v1`, plus `AI_API_KEY` and an explicitly selected `AI_MODEL`. The app calls `/chat/completions`. Confirm your provider supports JSON output and document inputs. No model or paid provider is silently selected.
5. Register, verify your email and sign in. Verified users without a company are onboarded to a new company; they cannot claim an existing company's role using signup metadata.
6. Set opening cash, vendors, budgets and invoices. Existing member roles can be changed by an administrator. Administrators can add an existing verified account by email and assign or change its role. This records an audit event. Email invitations are not sent by the app.

External AI remains optional. Without it, the advisor explicitly uses deterministic explanations grounded in the financial engine; document uploads remain available with manual field entry. No AI extraction is fabricated. The hosted demo does not have production email/signup or external AI configured.

The provided migration grants authenticated users **read-only** access to their companies through RLS. Writes occur through server-only service credentials after re-verifying the authenticated user and role. Direct authenticated calls to mutation RPCs are denied. Never expose the service credential.

## What is implemented

- Auth screen: cloud signup/sign-in, verified-user onboarding, company selection and isolated demo roles.
- Normalized PostgreSQL schema: companies, profiles, roles, vendors, categories, invoices, payments, receipts, receivables, budgets, alerts, recommendation lifecycle state, imports and audit logs.
- Company-scoped RLS, composite foreign keys, constraints, indexes and protected mutation functions.
- Atomic cloud changes, audit entries and optimistic revision checking. Consistent cloud reads use a single snapshot RPC.
- Shared integer-paise engine for cash, outstanding balances, budget exposure, vendor analytics and 0/30/60/90-day projections.
- Deterministic duplicate, amount, frequency, overdue, budget, data-quality and overpayment signals with calculations, input values and source IDs.
- Alert evidence persisted on ledger mutations; current signals are also recalculated on reads, including date-sensitive overdue conditions.
- Recommendations with OPEN → REVIEWED → ACCEPTED → COMPLETED or DISMISSED transitions, and audit records.
- Manual invoices, CSV column mapping, editable raw CSV preview, validation, row duplicate checking and SHA-256 replay prevention.
- Private PDF/PNG/JPEG upload, a server-only AI extraction adapter, field review and explicit confirmation before approval. When AI is not configured or fails, the stored document can be entered manually; no fictional extraction is shown.
- Approve/reject/investigate decisions, scheduled dates, partial payment recording, unique payment references and overpayment prevention.
- Receivables and receipt recording, with current cash recalculation.
- Dashboard, invoices, invoice details, cash flow, budgets, risk center, vendors, advisor, audit trail and settings pages.
- Invoice search, filters, server pagination; exact projection supporting records; monthly/quarterly/yearly budget ranges.
- Advisor with verified engine context, a server-only AI adapter, citation validation, numeric-text rejection and a clearly labeled deterministic fallback. All displayed calculation cards come from the engine.
- A feature-detected, read-only `read_financial_summary` WebMCP capability. Its supported-browser runtime validation remains unverified.

## Financial conventions

- `₹1 = 100` paise. User amounts allow at most two decimal places; negative invoice amounts are rejected.
- Approval is not payment. Rejected and unapproved invoices are excluded from committed payables; a previously approved invoice under investigation remains a liability.
- Current cash = opening cash + recorded receipts − completed payments from the opening date through the calculation date.
- Forecast horizons are **cumulative**, not separate monthly movements. Outstanding overdue items are included in the next horizon. Scheduled payment dates override due dates for the cash projection.
- Projection = current cash + expected collections − expected payments. Paying an existing payable reduces current cash and removes that same amount from future outflow; it is not subtracted twice.
- Budgets use invoice-date periods. Actual is the paid portion of those invoices, committed is their approved unpaid balance, and remaining = budget − actual − committed. Overlapping periods for a category are rejected.
- Amount anomalies require at least three earlier positive-value invoices for the vendor. Frequency compares the current month with the preceding three complete months and requires at least three historic records.
- All date calculations use ISO dates with UTC day boundaries in this MVP. UI freshness time is shown in IST.

## Validation performed

`npm test` includes financial and authorization tests plus a real embedded PostgreSQL migration test using PGlite. The latter checks RLS reads, denied authenticated writes, cross-company foreign-key rejection, atomic rollback of audit+invoice changes, revision conflicts and last-admin protection.

After building, run `node scripts/check-built.mjs` from the project root. It executes the built server in-process, tests demo login, server-rendering of ten routes, approval, metrics refresh, audit generation, grounded advisor output, viewer write denial and server-key separation from client bundles. It generates disposable demo data and QA HTML under `.data/` and `qa/`.

## Known limits / deployment gates

- This is a production-oriented **MVP source package**, not a production-certified financial system.
- Production Supabase Auth/email, production storage, AI extraction and the selected model require live verification after configuration.
- AI output is constrained and checked, but semantic hallucination is not mathematically ruled out. Use source records and human review. The deterministic fallback requires no external AI.
- The ledger snapshot is loaded server-side for aggregation. Invoices, risks, audit events, receivables, vendor histories, supporting projection records and the unified event ledger have server-side pagination. Dedicated SQL aggregation is still needed at large scale.
- File malware scanning, OCR-specific reliability testing, automated backup/recovery, MFA, rate limits, monitoring, session refresh and password-reset UI are not implemented. Cloud sessions expire after at most one hour and require sign-in again.
- The implementation records completed payments; it never transfers funds. It is not connected to a bank or ERP.
- Browser screenshot/responsive interaction QA and WebMCP browser validation depend on browser availability in the execution environment. See `docs/VALIDATION.md` for the final verification outcome.

## Project map

```
src/domain/       Shared types, date and money formatting
src/server/       Auth, storage adapters, validation and domain services
src/components/   Reusable forms, charts, navigation and UI pieces
src/pages/        Product pages
src/routes/       TanStack Start routes
 database/        PostgreSQL migration and RLS/RPC definitions
 tests/           Financial, access-control and PostgreSQL tests
 scripts/         Built application verification
```

## Competition presentation update

The interface now uses navy navigation, precise teal accents, clearer financial typography, a priority-review summary, and a cash calculation breakdown. The unified ledger includes invoice, payment, receivable and receipt sources. Advisor evidence is scoped to the question: budget formulas, invoice signals or 30/60/90-day cash projections. Unknown questions explicitly report missing context.

See `docs/PROMPT_COVERAGE.md` for remaining external-service requirements.
