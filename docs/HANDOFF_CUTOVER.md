# Production cutover checklist

Paint-by-numbers guide: go from "Mock extractor running locally" to "LLM extraction
with a durable corpus, deployed on one origin."

Prereqs (already done):
- Phase 1 ✅ — CRM is Vite/ESM, `getCurrentUserId()` exists
- Phase 2 ✅ — parser subtree at `src/features/quote/`
- Phase 3 ✅ — buy-quote form auto-fill wired (mock), `initForCrm` called on login

---

## Step 1 — Add root `/api` re-exports (5 min)

Serverless platforms (Vercel, Cloudflare Pages) expect functions at the **repo root**
`/api/`, not inside the subtree. Copy the thin shim files from the parser's
`crm-patch/api/` into your repo root, then do the same for Cloudflare's
`functions/api/` if you use Pages.

```bash
# from crm-project root
cp src/features/quote/crm-patch/api/extract.js   api/extract.js
cp src/features/quote/crm-patch/api/feedback.js  api/feedback.js
cp src/features/quote/crm-patch/api/golden.js    api/golden.js

# Cloudflare Pages only:
mkdir -p functions/api
cp src/features/quote/crm-patch/functions/api/extract.js  functions/api/extract.js
cp src/features/quote/crm-patch/functions/api/feedback.js functions/api/feedback.js
cp src/features/quote/crm-patch/functions/api/golden.js   functions/api/golden.js
```

These files are pure re-exports — they contain no logic and never need editing.

---

## Step 2 — Add `pg` to root `package.json` (2 min)

The Postgres backend uses the `pg` driver. It's an `optionalDependency` inside
the subtree, but **the platform's `npm install` reads the root `package.json`**,
so add it there too:

```json
// package.json (root)
"optionalDependencies": {
  "pg": "^8.13.0"
}
```

This keeps local dev working without Postgres — the file backend is the silent
fallback when `CORPUS_BACKEND` is unset.

---

## Step 3 — Provision a managed Postgres database (10-15 min)

Any managed Postgres works. Recommended (all have a free tier):

| Provider | Notes |
|---|---|
| **Neon** (neon.tech) | Serverless-native; use the pooled connection string |
| **Supabase** | Easy UI; use the "Transaction" pooler URL |
| **Railway** | No-frills, instant |
| AWS RDS / GCP Cloud SQL | If you're already there |

After provisioning, copy the connection string. It looks like:
```
postgres://user:pass@host:5432/db
```
Use the **pooled/pgBouncer** URL if the provider offers one — serverless functions
are short-lived and can exhaust a direct connection pool quickly.

---

## Step 4 — Add platform environment variables (5 min)

Set these on the deployment platform (Vercel → Settings → Environment Variables /
Cloudflare Pages → Settings → Environment Variables):

| Variable | Value | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-…` | Required if using Claude |
| `OPENAI_API_KEY` | `sk-…` | Required if using GPT |
| `DATABASE_URL` | `postgres://user:pass@host:5432/db` | Required for durable corpus |
| `CORPUS_BACKEND` | `postgres` | Required (default is `file`, ephemeral on serverless) |
| `PGSSL` | `require` | Required for most managed providers |
| `API_TOKEN` | a random secret (see below) | Strongly recommended |
| `ALLOWED_ORIGIN` | your app's URL, e.g. `https://crm.example.com` | Strongly recommended |
| `MAX_BODY_BYTES` | `4194304` (4 MB) | Optional; this is the default |
| `FEWSHOT_LIMIT` | `3` | Optional; enables few-shot retrieval from corpus |

Generate a random `API_TOKEN`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or: openssl rand -hex 32
```

> Keep this value — you'll paste it into the app Settings next.

---

## Step 5 — Add `vercel.json` (Vercel only, 2 min)

If using Vercel, add this to the repo root (or merge with your existing one):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "functions": {
    "api/extract.js":  { "maxDuration": 30 },
    "api/feedback.js": { "maxDuration": 15 },
    "api/golden.js":   { "maxDuration": 15 }
  }
}
```

For **Cloudflare Pages**: go to Settings → Functions → enable the
**`nodejs_compat`** compatibility flag. Without it `process.env` doesn't exist
and the env bridge silently fails.

---

## Step 6 — Deploy and verify the proxy (2 min)

Push and let the platform build. Then:

```bash
# should return 401 (auth guard active), NOT 404
curl -I https://your-app.vercel.app/api/extract

# should return 200 with items array (even if empty)
curl -H "Authorization: Bearer <API_TOKEN>" \
  https://your-app.vercel.app/api/feedback
```

If you get 500 with a message about `DATABASE_URL`, the env var isn't set.
If you get 500 about `pg not found`, add `pg` to root `package.json` (Step 2).

The corpus table (`corpus`) is **auto-created on first write** — no manual
migration needed.

---

## Step 7 — Configure app Settings (2 min)

Open the deployed app → **Settings** tab:

| Field | Value |
|---|---|
| Proxy URL | `/api/extract` |
| Feedback corpus URL | `/api/feedback` |
| API token | the `API_TOKEN` value from Step 4 |
| Default extractor | keep `Mock` for now (flip in Step 8) |

Save. The feedback sync will immediately push any locally-stored examples to
the DB and pull the canonical set back.

---

## Step 8 — Flip the extractor to LLM (1 min)

Two places to change — do both:

**A. In-app Settings:** change "Default extractor" from `Mock` to `LLM (proxy)`.
This changes the UI default for new sessions.

**B. In code** (for the auto-fill path in `openQuoteForm`):

```js
// was:
const { quote, buyQuote } = await buildBuyQuoteFromFile(
  file, fileMeta, { extractorId: "mock" });

// change to:
const { quote, buyQuote } = await buildBuyQuoteFromFile(
  file, fileMeta);     // uses Settings default ("llm") — no override needed
```

Commit and redeploy.

---

## Step 9 — Smoke-test end-to-end (5 min)

1. Upload one of the sample reseller quotes (PDF or CSV from a real vendor).
2. Confirm the LLM extraction returns line items with HW/SW/PS categories.
3. Correct one line, add a note in "What did the extractor get wrong?", click
   **Save correction**.
4. Go to **Feedback** tab → **Sync now** → confirm the example appears and shows
   `📝` with your note.
5. In a DB client (or Neon/Supabase UI), verify a row exists in the `corpus`
   table with `kind = 'feedback'`.
6. Go to **Eval** tab → **Seed golden from samples** → **Run eval** →
   record the baseline F1/accuracy numbers. These are your "before" numbers.

---

## Step 10 — Wire the high-fidelity review panel (optional but recommended)

The auto-fill currently records `predicted` vs `predicted` (a no-op correction).
To get real training signal:

```js
import { mountReviewPanel } from "./features/quote/src/ui/reviewPanel.js";
import { recordReview } from "./features/quote/src/integration/crmBridge.js";

// After auto-fill populates the form, mount the review panel in a container
// element on the buy-quote form (e.g. a <div id="qp-review-panel"> below the
// line-item fields):
const panel = mountReviewPanel("#qp-review-panel", {
  quote: area._predicted,
  onSave(corrected, { note }) {
    recordReview(area._predicted, corrected, {
      fileName: file.name,
      note,
    });
    showToast("Correction saved — thank you!", "ok");
  },
});
```

Every saved correction now produces a **full-fidelity, line-item-level** labeled
example in the corpus. That's the signal that makes the model measurably better
over time.

---

## Reviewer note (v2 contract)

The corpus contract is at `exampleSchemaVersion: 2`. The note field ("what did
the extractor get wrong?") is a first-class field — it travels with the example
through export/import and any future migration. The migration chain in
`src/features/quote/src/dataset/contract.js` upgrades older examples automatically
on read; you never lose data.

---

## Pulling future upstream changes

After this cutover, all parser changes (extraction, schema, prompt, eval) come
from the upstream `suckacraft/test2`. To pull:

```bash
git subtree pull --prefix=src/features/quote \
  https://github.com/suckacraft/test2.git claude/reseller-quote-parsing-poc-bqqeG
npm run build   # verify, then PR
```

The root `/api` re-exports don't change — they'll keep working after every pull.

See [SYNC.md](./SYNC.md) for the upstream/downstream rules.
