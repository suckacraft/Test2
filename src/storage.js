// ─────────────────────────────────────────────────────────────────────────────
// storage.js — localStorage persistence, mirroring the CRM's ss()/ls() helpers
// and key naming (kb_* prefix) so this module drops into crm-project cleanly.
// Holds: POC settings, the feedback dataset, and the eval golden set.
// ─────────────────────────────────────────────────────────────────────────────

export const KEYS = {
  settings: "qp_settings",     // qp_ = quote-parser, to avoid clashing with kb_*
  feedback: "qp_feedback",     // array of labeled examples (the training data)
  golden: "qp_golden",         // array of golden eval cases
};

export function ls(key, dflt = null) {
  try { const v = localStorage.getItem(key); return v == null ? dflt : JSON.parse(v); }
  catch { return dflt; }
}
export function ss(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.warn("storage full or blocked", e); return false; }
}

const DEFAULT_SETTINGS = {
  extractorId: "mock",         // start offline-safe; switch to "llm" once proxy is up
  provider: "anthropic",       // "anthropic" | "openai"
  model: "",                   // blank → proxy default for the provider
  proxyUrl: "/api/extract",    // where the serverless proxy lives
  defaultMarkupPct: 20,        // sell = cost * (1 + markup) for the customer template
  currency: "USD",
};

export function getSettings() { return { ...DEFAULT_SETTINGS, ...(ls(KEYS.settings, {}) || {}) }; }
export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  ss(KEYS.settings, next);
  return next;
}

export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
