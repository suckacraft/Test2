// ─────────────────────────────────────────────────────────────────────────────
// api/extract.js — serverless function wrapper (Vercel / Netlify-functions
// style). Same handler the local server uses; deploy this and point the app's
// Settings → proxyUrl at it. Keys come from the platform's env vars.
// ─────────────────────────────────────────────────────────────────────────────

import { handleExtract } from "../handler.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const result = await handleExtract(body);
  res.status(result.status).json(result.json);
}

// For platforms that pass a Web Request (Cloudflare Workers / Netlify Edge):
export async function onRequest(context) {
  const req = context.request;
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors() });
  // Cloudflare passes secrets on context.env, but handler.js reads process.env.
  // Bridge them (requires the `nodejs_compat` flag so `process` exists).
  if (context.env && typeof process !== "undefined") {
    for (const k of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY"])
      if (context.env[k] && !process.env[k]) process.env[k] = context.env[k];
  }
  const body = await req.json().catch(() => ({}));
  const result = await handleExtract(body);
  return new Response(JSON.stringify(result.json), {
    status: result.status, headers: { "content-type": "application/json", ...cors() },
  });
}
function cors() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS" };
}
