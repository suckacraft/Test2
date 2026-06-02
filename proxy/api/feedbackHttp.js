// Serverless wrappers for the corpus endpoints, shared by Vercel (default
// export) and Cloudflare (onRequest). One factory per platform, bound to a kind.

import { handleFeedback } from "../feedbackStore.js";

function cors() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
}

/** Vercel / Netlify-node style (req, res). */
export function vercel(kind) {
  return async (req, res) => {
    for (const [k, v] of Object.entries(cors())) res.setHeader(k, v);
    if (req.method === "OPTIONS") { res.status(204).end(); return; }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const r = await handleFeedback(req.method, kind, body);
    res.status(r.status).json(r.json);
  };
}

/** Cloudflare Pages Functions style onRequest(context). */
export function cf(kind) {
  return async (context) => {
    const req = context.request;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    // Bridge DB config from context.env (needs the nodejs_compat flag).
    if (context.env && typeof process !== "undefined") {
      for (const k of ["DATABASE_URL", "CORPUS_BACKEND", "PGSSL"])
        if (context.env[k] && !process.env[k]) process.env[k] = context.env[k];
    }
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : null;
    const r = await handleFeedback(req.method, kind, body);
    return new Response(JSON.stringify(r.json), {
      status: r.status, headers: { "content-type": "application/json", ...cors() },
    });
  };
}
