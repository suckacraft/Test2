// ─────────────────────────────────────────────────────────────────────────────
// feedback.js — the improvement loop.
//
// Every time a human reviews an extraction and corrects it, we store a labeled
// example: { input fingerprint, what the model produced, what it SHOULD be }.
// That dataset is the asset that lets us improve inference over time — it powers
// the eval harness today and few-shot / fine-tuning / prompt-tuning tomorrow.
//
// Exportable as JSONL so it can leave the browser and feed any training or eval
// pipeline (including your company LLM).
// ─────────────────────────────────────────────────────────────────────────────

import { KEYS, ls, ss, uid } from "./storage.js";

export function getFeedback() { return ls(KEYS.feedback, []) || []; }

/**
 * Record one review outcome.
 * @param predicted  StandardizedQuote the extractor produced
 * @param corrected  StandardizedQuote after human edits (the label)
 * @param context    { fileName, extractor, model, docText }
 */
export function recordCorrection(predicted, corrected, context = {}) {
  const example = {
    id: uid(),
    ts: new Date().toISOString(),
    fileName: context.fileName || corrected.source?.fileName || "",
    extractor: context.extractor || predicted.meta?.extractor || "",
    model: context.model || predicted.meta?.model || "",
    // Keep a trimmed copy of the source so the example is self-contained for
    // future training/eval without re-uploading the original file.
    inputExcerpt: (context.docText || "").slice(0, 8000),
    predicted,
    corrected,
    diff: diffQuotes(predicted, corrected),
  };
  const all = getFeedback();
  all.push(example);
  ss(KEYS.feedback, all);
  return example;
}

export function clearFeedback() { ss(KEYS.feedback, []); }

/** Promote a correction into the golden eval set (its label becomes truth). */
export function promoteToGolden(exampleId) {
  const ex = getFeedback().find(e => e.id === exampleId);
  if (!ex) return null;
  const golden = ls(KEYS.golden, []) || [];
  golden.push({
    id: uid(), name: ex.fileName || ex.id, ts: new Date().toISOString(),
    inputExcerpt: ex.inputExcerpt, expected: ex.corrected,
  });
  ss(KEYS.golden, golden);
  return golden[golden.length - 1];
}
export function getGolden() { return ls(KEYS.golden, []) || []; }

/**
 * Field-level diff between predicted and corrected quotes. This is the raw
 * material for "where does the model go wrong" analytics.
 */
export function diffQuotes(pred, corr) {
  const changes = [];
  const fields = [
    ["source.vendor", pred.source?.vendor, corr.source?.vendor],
    ["source.quoteNumber", pred.source?.quoteNumber, corr.source?.quoteNumber],
    ["source.currency", pred.source?.currency, corr.source?.currency],
    ["source.validUntil", pred.source?.validUntil, corr.source?.validUntil],
    ["totals.grandTotalCost", pred.totals?.grandTotalCost, corr.totals?.grandTotalCost],
  ];
  for (const [path, a, b] of fields)
    if (String(a ?? "") !== String(b ?? "")) changes.push({ path, from: a, to: b });

  const pLines = pred.lineItems || [], cLines = corr.lineItems || [];
  if (pLines.length !== cLines.length)
    changes.push({ path: "lineItems.count", from: pLines.length, to: cLines.length });
  const n = Math.min(pLines.length, cLines.length);
  for (let i = 0; i < n; i++) {
    for (const f of ["sku", "description", "category", "quantity", "unitCost", "extendedCost"]) {
      if (String(pLines[i][f] ?? "") !== String(cLines[i][f] ?? ""))
        changes.push({ path: `lineItems[${i}].${f}`, from: pLines[i][f], to: cLines[i][f] });
    }
  }
  return changes;
}

/** Serialize the dataset as JSONL — one example per line. */
export function exportJsonl() {
  return getFeedback().map(e => JSON.stringify({
    fileName: e.fileName, extractor: e.extractor, model: e.model,
    input: e.inputExcerpt, output: e.corrected,
  })).join("\n");
}
