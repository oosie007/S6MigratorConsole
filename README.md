# S6 → Catalyst Migration Console

Black-and-white shadcn + Tailwind web app for managing migrations from legacy System 6 policy admin to Catalyst. **Currently uses mock data**; ready for API integration.

---

## Quick start (for engineers)

**Prerequisites:** Node.js 18+ and npm.

```bash
# From the project root (after unzipping or cloning)
npm install
npm run dev
```

Then open **http://localhost:3000**.

**One-liner after you have the folder:**

```bash
npm install && npm run dev
```

---

## Run locally (from this repo)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If you want to use the live UAT policy search APIs on the **Policies** page instead of pure mock data, you must also create a local `.env.local` with the UAT settings that your team shares out of band (not in this repo).

For the **Documents** tab on a policy detail page, the app calls the Catalyst document search API. If you get a 404:
- Set **`UAT_POLICY_DOCUMENTS_URL`** to the exact full URL that works in Postman (recommended), or
- Add **`UAT_POLICY_DOCUMENTS_USE_POLICY_BASE=true`** to use the policy base URL (`UAT_API_BASE_URL`, e.g. `digital.policy.catalyst`) instead of `UAT_DOCUMENT_API_BASE_URL`, or
- Set **`UAT_POLICY_DOCUMENTS_PATH`** to a different path (default is `/CatalystDocumentAPI/documents/search`). The UI shows the URL we tried when a 404 occurs.

**Document download** (Download button on the Documents tab) uses the same token as search and sends **`UAT_POLICY_IMPERSONATE_ID`** in an impersonation header. If you get **403 Forbidden**, the API may expect a different header name: set **`UAT_POLICY_DOCUMENTS_DOWNLOAD_IMPERSONATE_HEADER`** (e.g. `X-Impersonate-Id`). Check your API docs for the exact header name.

## What’s included

- **Dashboard** (`/`) – Migration stats (total policies, migrated, failures, in progress). Uses migrations from context so new migrations are included.
- **Migrations list** (`/migrations`) – Table of migration projects; expand a row to see product and policies. Click a row or “View” to open the migration detail. New migrations appear here after you create them.
- **New migration** (`/migrations/new`) – Short wizard: **Name & date** → **Source product** (dropdown, no policies loaded) → **Target product** → **Done**. Redirects to the migrations table with the new migration added.
- **Migration detail** (`/migrations/[id]`) – Pipeline (Trello-style):
  - **Tabs**: All · Validation Failed · Validated · Migrated · Verified · Verification Failed. Policies move between tabs as you run Validate → Migrate → Verify.
  - **Policies table**: Checkboxes to select one, some, or all. Buttons on the right: **Validate**, **Migrate**, **Verify**.
  - **Validate**: Runs validation on selected policies. Failed policies cannot be migrated and appear in the “Validation Failed” tab.
  - **Migrate**: Only validated policies can be migrated. Shows per-policy progress (spinner then success/fail).
  - **Verify**: Only migrated policies can be verified. Mock compares attributes (dates, premium, customer). Failed ones appear in “Verification Failed” tab.
- **Validation Failed** (`/validation-failed`) – Global list of all policies (across migrations) that failed validation. Link through to the migration to fix and re-validate.
- **Verification Failed** (`/verification-failed`) – Global list of all migrated policies that failed verification. Link through to the migration to fix and re-verify.

When everything succeeds, the “source” (pending) area empties and policies sit in Validated → Migrated → Verified.

## Where to plug in APIs

- **Mock data** – `src/lib/mock-data.ts`: replace product/migration lists, `getMockPoliciesForProduct()`, `runMockValidation()`, `runMockVerification()`, `createMigration()`. Types (`Policy`, `MigrationProject`, `PolicyPipelineStatus`, etc.) can stay.
- **Context** – `src/contexts/migrations-context.tsx`: replace in-memory migrations and policy statuses with API calls (list migrations, get/update per-policy status).
- **Dashboard** – `src/app/page.tsx`: `getDashboardStats(migrations)` can call an aggregate stats API.
- **Migrations list** – `src/app/migrations/page.tsx`: uses `useMigrations().migrations`; replace with list API.
- **Migration detail** – `src/app/migrations/[id]/page.tsx`: replace `getMockPoliciesForProduct`, `runMockValidation`, `runMockVerification` with APIs; keep Validate/Migrate/Verify flow and tabs.
- **Validation Failed / Verification Failed** – `src/app/validation-failed/page.tsx`, `src/app/verification-failed/page.tsx`: replace `getAllValidationFailed()` / `getAllVerificationFailed()` with APIs that return (migration, policy, errors).

Build: `npm run build`.

---

## How to package and share this project

**Option A – Zip (no Git)**  
From the parent of `S6MigratorConsole`:

```bash
# Exclude node_modules and build output so the archive is small
zip -r S6MigratorConsole.zip S6MigratorConsole -x "S6MigratorConsole/node_modules/*" -x "S6MigratorConsole/.next/*" -x "S6MigratorConsole/.git/*"
```

Or use the included script from inside the project:

```bash
cd S6MigratorConsole
npm run package
```

This creates `S6MigratorConsole.zip` in the parent folder (excluding `node_modules`, `.next`, `.git`).

Then send `S6MigratorConsole.zip` (or the tarball). The recipient unzips and runs `npm install && npm run dev`.

**Option B – Git**  
Push to a repo and share the clone URL. The other engineer runs:

```bash
git clone <repo-url>
cd S6MigratorConsole
npm install
npm run dev
```

Once running, open `http://localhost:3000` and:

- Use **Dashboard / Migrations** for the mock migration flows.
- Use **Policies** to search either:
  - By **effective date** (UAT-backed when env is set; mock otherwise).
  - By **policy number** (UAT-backed when env is set; mock otherwise).

