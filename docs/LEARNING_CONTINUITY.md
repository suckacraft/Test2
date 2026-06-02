# Learning continuity: keeping the corpus alive across product change

> How we ensure the learnings captured in feedback + evaluation transfer
> continuously, even when the app, the model, the storage, or the repo changes.

## The core principle

**Treat the learning corpus as a first-class, versioned, app-independent data
product — captured by the app, owned by a durable store, consumed by the
evaluator/distillation independently.** The application is disposable; the corpus
is not.

Three layers, deliberately decoupled by stable contracts:

```
  CAPTURE                 STORE (durable)              CONSUME
  the UI/app              the corpus's real home       eval + distillation
  (changes freely)        (stable contract)            (reads the store, not the app)
        │                        ▲  │                        │
        └── versioned example ───┘  └──── JSONL / HTTP ───────┘
            (contract.js)               (store.js / feedbackStore.js)
```

Because the layers talk through contracts (the example schema + the HTTP/JSONL
interchange), **any one layer can be replaced without losing the corpus.**

## What was the risk

Originally the corpus lived only in **browser `localStorage`** — device-bound,
origin-bound, user-bound, and one cache-clear from gone. A UI rewrite, a new
origin, a storage-key change, or a model swap could orphan or invalidate it.

## The five mechanisms that fix it

### 1. A versioned, portable example contract (`src/dataset/contract.js`)
Every example carries `exampleSchemaVersion` and full **provenance**:
```
provenance: { appVersion, quoteSchemaVersion, extractor, model, promptVersion, vendor, fileName }
```
So an example remains interpretable forever, and runs stay **comparable** after
the product changes — you can always answer "which app/model/prompt produced
this prediction?".

### 2. Migrations, never deletions (`migrateExample`)
When the example shape evolves, old data is **transformed up** to the current
version on read (the same pattern as the CRM's `CONFIG_VERSION`/`migrateConfig`).
Legacy records are never dropped — verified by the smoke test.

### 3. A durable store behind a stable contract (`proxy/feedbackStore.js`)
The corpus's real home is **outside the browser**: append-only JSONL behind
`GET/POST /api/feedback` (and `/api/golden`). JSONL is plain-text, diffable, and
trivially committable to a dataset git repo or synced to object storage. Swap the
file backend for a DB/S3 in production — the HTTP contract is unchanged, so
nothing else moves.

### 4. Continuous transfer (`src/dataset/sync.js`)
`localStorage` becomes a *working copy* that converges to the durable store:
- on **save** → push new examples up (best-effort);
- on **boot** → `rehydrate()` pulls the canonical set down (merge by id).

A wiped browser, a new device, a new origin, or a freshly deployed product simply
**re-pulls the entire corpus**. That is the continuity guarantee.

### 5. Model-agnostic evaluation (`src/evaluate.js`)
The eval harness scores **any** extractor against the golden set. The golden set
is input→output truth — independent of which LLM produced a prediction. So when
you switch Claude → GPT → your company LLM, the corpus and the metrics stay valid;
only the extractor implementation changes. The golden set is the institutional
memory **and** the regression gate.

## Operating model: the change gate

Make corpus-transfer a habit, not an afterthought:

- **Any change to the extractor / model / prompt** → bump its version
  (`PROMPT_VERSION` in `proxy/prompt.js`, model id, `APP_VERSION`) → **re-run eval
  against the full golden set** → store the run with provenance. The numbers tell
  you if the change helped; the provenance lets you roll back the decision.
- **Distillation is regenerated from the store, not hand-carried:** few-shot
  exemplars in the prompt, per-vendor rules, and fine-tuning sets are all derived
  from the durable corpus. Changing the model = re-run distillation over the same
  corpus.

## Where the corpus should ultimately live (recommended)

A dedicated, versioned **dataset store** separate from the app repo:
- **Simplest / most auditable:** a `quote-corpus` git repo holding
  `feedback.jsonl` + `golden.jsonl`. The proxy commits/syncs to it. Full history,
  diffable, survives anything.
- **Most continuous / queryable:** a small managed DB or object store behind the
  same `/api/feedback` contract (point `DATA_DIR`/the backend there). Best when
  multiple users/instances contribute concurrently.

Either way, the app and the CRM are just **clients** of that store. When the two
chats merge (see [MIGRATION.md](./MIGRATION.md)), nothing about the corpus
changes — it was never coupled to the app in the first place.

## Continuity checklist
- [ ] Every example has `exampleSchemaVersion` + provenance ✅ (contract.js)
- [ ] Schema bumps ship a migration; no example is ever dropped ✅ (migrateExample)
- [ ] Corpus persists outside the browser ✅ (feedbackStore.js, swappable backend)
- [ ] Local ⇄ durable sync on save + boot ✅ (sync.js)
- [ ] Eval is model-agnostic, run on every extractor/prompt/model change ✅
- [ ] Distillation (few-shot / rules / fine-tune sets) regenerated from the store
- [ ] Corpus lives in its own versioned store/repo, app is just a client
