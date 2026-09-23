# Validation record

Local source validation, 22 September 2026:

- TypeScript strict checks: passed.
- Production client and server builds: passed.
- Thirteen financial/authorization/PostgreSQL tests: passed.
- Built-server demo sign-in and ten application routes: passed.
- Built-server approval, updated metrics, audit event and grounded advisor: passed.
- Built-server viewer write denial: passed.
- Client bundles contain no server secret environment variable references: passed.
- Browser sign-in and desktop dashboard rendering: passed; screenshot visually inspected.
- Browser invoice creation, approval, advisor response, mobile width, mobile navigation and console checks: passed. Explicit accessible form labels, centered dialogs and readable mobile chart values were verified.

No real financial data or external payments were used. External AI, production Supabase Auth/email and production storage remain unconfigured. Native-browser WebMCP validation remains unverified.

## Independent hosted version

The Sites version retains the same finance engine and pages. Additional checks cover platform identity, cross-origin rejection, user-bound cookies, D1 atomic updates, fresh-session persistence, R2 upload/retrieval and denied cross-company document access. All 13 existing domain/PostgreSQL tests pass. Hosted demo roles are explicitly simulated; production Supabase and external AI are not configured.

Actual Cloudflare Workers runtime verification (Miniflare/workerd): sign-in page, session creation, D1 ledger reads, approval/audit writes, and private R2 document upload/retrieval passed.

## Competition presentation update

- Revised desktop and mobile layouts visually inspected.
- Browser sign-in, create invoice, approve invoice, advisor, ledger search, mobile navigation and no horizontal page overflow passed. No browser page errors.
- Added pagination, membership permission, question-scope, model-output rejection and document-extraction validation tests.
- Membership tests run against embedded PostgreSQL; AI adapter tests use mocked provider responses. Live provider integration remains pending.
