# Finance Advisor — project handoff

This ZIP contains the latest redesigned application source, PostgreSQL migrations, sample CSV, tests, screenshots and documentation. It does not require Lovable to run locally.

## Run on Windows, macOS or Linux

1. Install Node.js 24 LTS with npm.
2. Extract this ZIP. Open a terminal in the Finance-Advisor folder (the folder containing package.json).
3. Run:

```bash
npm ci
npm run setup:demo
npm run dev
```

4. Open http://localhost:3000/auth and click **Open demo workspace**.
5. Use the Finance and Viewer options to demonstrate role restrictions.

The setup command creates a random local session secret and preserves any existing .env. Keep the terminal open while using the app. Stop it with Ctrl+C.

## Included

- Navy/teal responsive UI, dashboard, invoices/details, cash flow, budgets, risk center, vendors, advisor, audit, settings and financial ledger.
- Deterministic financial calculations and risk/recommendation rules, manual invoices, CSV imports, partial payments and receipts.
- Document upload/review, question-scoped evidence, pagination and source links.
- Normalized PostgreSQL schema, RLS, protected member management and adapter code.
- 18 passing tests at handoff; browser interaction and Workers runtime checks passed in the build environment.

## Important completion status

The local demo uses fictional data saved on your computer. Live AI is not configured: the advisor explicitly uses rule-based explanations and uploaded documents need manual field entry. Real PostgreSQL/Auth/Storage and real company accounts require your own Supabase connection. The requested GPT-6 Astra model must be available through your chosen AI provider and verified; no API key or model access is included.

For production, follow README.md, apply database/001_schema.sql then database/002_members.sql to a new compatible Supabase database, and configure server-only environment variables. See docs/PROMPT_COVERAGE.md for the exact completion status. Do not describe this handoff as having live AI already connected.

## Validate and build

```bash
npm run typecheck
npm test
npm run build
npm start
```

npm run build produces both the Node server and the optional Workers adapter. npm start serves the standalone Node version. The hosting manifest contains no existing project identity: use your own host/account for deployment. No credentials, financial data, installed dependencies or Git history are included.

Read docs/DEMO_WALKTHROUGH.md for a presentation sequence and docs/VALIDATION.md for verification details.
