# Keeping the parser in sync after the merge

The quote-parser has been grafted into `crm-project` via `git subtree` at
`src/features/quote/`. That makes the relationship **upstream → downstream**:

```
  suckacraft/test2  ── git subtree ──▶  crm-project/src/features/quote/
  (UPSTREAM: source of truth)          (DOWNSTREAM: a synced copy)
```

## The one rule

**Make parser changes here (upstream), then pull them downstream.** Do **not**
edit files inside `crm-project/src/features/quote/` directly — in-place edits make
the next `subtree pull` conflict and the two copies drift.

| Want to change… | Do it in… |
|---|---|
| extraction, schema, eval, feedback, review panel, proxy | `test2` (here) → pull into the CRM |
| how the CRM *calls* the parser (openQuoteForm wiring, mounting the review panel, routes) | `crm-project` (that's CRM glue, not parser code) |

The seam between them is `src/integration/crmBridge.js` — the CRM only imports
from there. New CRM-facing needs → add an export to the bridge **here**, then pull.

## Pulling upstream changes into the CRM

In a `crm-project` clone, on a branch:

```bash
git subtree pull --prefix=src/features/quote \
  https://github.com/suckacraft/test2.git claude/reseller-quote-parsing-poc-bqqeG
npm run build   # verify, then PR
```

(Use whichever upstream branch is current — eventually `main` of `test2`.)

## Guardrails that keep pulls clean
- **CI on this repo** (`.github/workflows/ci.yml`) runs the smoke tests + build on
  every push, so the upstream is always in a pullable state.
- **Don't fork the schema.** `src/schema.js` (`StandardizedQuote`) stays the single
  source of truth; the CRM's `buyQuote` is a projection via `crmAdapter.js`.
- **Bump versions on change** (`APP_VERSION`, `EXAMPLE_SCHEMA_VERSION`,
  `PROMPT_VERSION`) so the corpus stays comparable across pulls.
- **Eventual cleanup (MIGRATION.md Phase 6):** the subtree carried the standalone
  shell (`index.html`), `proxy/`, `tests/`, `docs/` into the CRM. Leave them for
  now; when you prune, relocate the proxy to the CRM's root `/api` (see below).

## Production cutover note (proxy location)

Serverless platforms expect functions at the repo **root** `/api`. After the
subtree, the proxy lives at `crm-project/src/features/quote/api/*`. Add thin
root re-exports in `crm-project` so the platform finds them:

```js
// crm-project/api/extract.js
export { default } from "../src/features/quote/proxy/api/extract.js";
// crm-project/api/feedback.js
export { default } from "../src/features/quote/proxy/api/feedbackHttp.js"; // wrap with vercel("feedback")
```

Then set env (`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, `DATABASE_URL`,
`CORPUS_BACKEND=postgres`, `API_TOKEN`, `ALLOWED_ORIGIN`) and the app Settings
(`proxyUrl=/api/extract`, `feedbackUrl=/api/feedback`, `apiToken`), then flip the
extractor to `llm`. Full steps in [DEPLOYMENT.md](./DEPLOYMENT.md).
