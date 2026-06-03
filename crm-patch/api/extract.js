// crm-project root: /api/extract.js
// Vercel / Netlify-node serverless entry — re-exports the handler that lives
// inside the quote-parser subtree at src/features/quote/proxy/api/extract.js.
// Vercel auto-detects files in /api as functions; this keeps them at the repo
// root where the platform expects them without duplicating any logic.
export { default, onRequest } from "../src/features/quote/proxy/api/extract.js";
