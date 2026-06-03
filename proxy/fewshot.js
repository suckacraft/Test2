// ─────────────────────────────────────────────────────────────────────────────
// fewshot.js — corpus-driven few-shot retrieval. Before extracting, pull the
// most RELEVANT human-reviewed examples from the durable corpus and show them to
// the model as worked examples. This is the concrete mechanism by which the
// system gets better over time: every correction a human makes becomes guidance
// for the next similar quote.
//
// Retrieval is a lightweight token-overlap rank against the incoming document
// (RAG-lite) — no embeddings needed for a POC, and it naturally favours the same
// vendor/layout. Gated by FEWSHOT_LIMIT (0 = off, deterministic baseline).
// ─────────────────────────────────────────────────────────────────────────────

import { handleFeedback } from "./feedbackStore.js";

export async function selectExemplars(documentText, { limit = 0 } = {}) {
  if (!limit) return [];
  let items = [];
  try {
    const res = await handleFeedback("GET", "feedback", null);
    items = res.json?.items || [];
  } catch { return []; }
  if (!items.length) return [];

  const docTokens = tokenSet(documentText);
  const scored = items.map(e => {
    const input = e.inputExcerpt || e.input || "";
    const output = e.corrected || e.output || null;
    return { input, output, score: overlap(docTokens, tokenSet(input)) };
  }).filter(x => x.output && x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(x => ({ input: x.input.slice(0, 1500), output: compactOutput(x.output) }));
}

// Trim a corrected quote to the essentials so exemplars stay token-cheap.
export function compactOutput(q) {
  return {
    source: {
      vendor: q.source?.vendor || "", quoteNumber: q.source?.quoteNumber || "",
      currency: q.source?.currency || "USD", validUntil: q.source?.validUntil || "",
    },
    lineItems: (q.lineItems || []).map(li => ({
      sku: li.sku || "", description: li.description || "", category: li.category,
      quantity: li.quantity, unitCost: li.unitCost, extendedCost: li.extendedCost,
    })),
    totals: { tax: q.totals?.tax || 0, shipping: q.totals?.shipping || 0,
      grandTotalCost: q.totals?.grandTotalCost ?? 0 },
  };
}

function tokenSet(s) {
  return new Set(String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(t => t.length > 2));
}
function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let hit = 0; for (const t of b) if (a.has(t)) hit++;
  return hit / Math.sqrt(a.size * b.size); // cosine-ish
}
