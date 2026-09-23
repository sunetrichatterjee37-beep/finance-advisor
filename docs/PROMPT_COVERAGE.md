# Original master prompt — current completion record

The original MASTER PROMPT.pdf remains the specification. The user's later instruction to proceed without Lovable changes the hosting provider, not the functional requirements. The replacement AI prompt posted later was not adopted.

## Delivered and checked

- TanStack Start, React, TypeScript, Tailwind, server-side business logic; no Python backend.
- Responsive financial workspace and every requested page, plus the unified financial event ledger and settings.
- Integer paise calculations; one financial engine; partial payments, outstanding balances, current cash, cumulative projections, budget actual/committed/remaining, vendor metrics.
- Deterministic risks, grouped evidence and recommendation lifecycle, human approval/rejection/investigation, audit records.
- Manual invoices, CSV mapping/edit/validation/deduplication, private document uploads, human confirmation.
- Server-side pagination for invoice/risk/audit/receivable/ledger/history/projection records.
- Question-scoped advisor evidence, explicit missing-context responses and no automatic financial actions.
- Private Sites deployment, ChatGPT identity, isolated persistent fictional demo ledgers and private R2 uploads.

## Implemented but not connected to a live production service

- Normalized PostgreSQL schema, constraints, RLS, atomic commits, verified-user onboarding and server-only credentials. Locally tested with embedded PostgreSQL.
- Company membership: administrators add verified accounts by email and change roles; service-only SQL protects membership changes and writes audit records. Last administrator protection is tested.
- AI advisor and PDF/image extraction adapters. Output validation rejects invented numeric explanation text, unknown record citations, malformed extraction objects and unsupported document currencies. Mocked adapter tests do not establish live model reliability.

## Required connections before claiming full PDF completion

1. Connect Supabase: select/provision the production PostgreSQL/Auth/Storage project, apply migrations, configure server-only credentials, and verify real signup, company membership, RLS and private document access.
2. Connect OpenAI Developers or an authorized compatible AI provider: verify access to the PDF's requested GPT-6 Astra model, configure server-only credentials and run live advisor/extraction tests. Do not silently substitute a different model. API billing/account approval may be required.
3. Run final production integration and cross-company tests against those connected services.

The live demo still uses D1 snapshots, simulated roles and deterministic explanations. It does not yet meet the PostgreSQL/live-AI requirements. The Site remains owner-private; judging access has not been made public.

## Practical limitations

Server-side aggregation currently reads a ledger snapshot. Large deployments require SQL aggregation and performance testing. Native WebMCP browser support remains unverified. No bank integration or money transfer is implemented or requested. Production backup/recovery and operational monitoring are not yet commissioned.
