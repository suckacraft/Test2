// ─────────────────────────────────────────────────────────────────────────────
// feedbackStore.js — the DURABLE home for the learning corpus, behind the proxy.
//
// File-backed JSONL (append-only, deduped by id) so the corpus is plain-text,
// diffable, and trivially committable to a dataset git repo or synced to object
// storage. The data lives OUTSIDE the app — that's the whole point: rewrite the
// UI, change the model, move repos, and the corpus is untouched.
//
// Swap this one file for a DB / S3 / GCS implementation in production; the HTTP
// contract (GET → {items}, POST {items} → {appended}) stays the same, so nothing
// else changes. On serverless, set DATA_DIR to a mounted volume or use a DB —
// the local filesystem there is ephemeral.
// ─────────────────────────────────────────────────────────────────────────────

import { readFile, appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
const KINDS = new Set(["feedback", "golden"]);

export async function handleFeedback(method, kind, body) {
  if (!KINDS.has(kind)) return { status: 400, json: { error: `unknown kind "${kind}"` } };
  const file = join(DATA_DIR, `${kind}.jsonl`);

  if (method === "GET") {
    const items = await readAll(file);
    return { status: 200, json: { items } };
  }
  if (method === "POST") {
    const items = Array.isArray(body?.items) ? body.items : [];
    const existing = new Set((await readAll(file)).map(x => x.id));
    const fresh = items.filter(x => x && x.id && !existing.has(x.id));
    if (fresh.length) {
      await mkdir(DATA_DIR, { recursive: true });
      await appendFile(file, fresh.map(x => JSON.stringify(x)).join("\n") + "\n");
    }
    return { status: 200, json: { appended: fresh.length, total: existing.size + fresh.length } };
  }
  return { status: 405, json: { error: "GET or POST only" } };
}

async function readAll(file) {
  try {
    const text = await readFile(file, "utf8");
    return text.split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}
