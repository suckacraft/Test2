// crm-project root: /functions/api/extract.js
// Cloudflare Pages Functions entry — maps the route /api/extract.
// Cloudflare calls onRequest(context) with a Web Request and expects a Web Response.
// The nodejs_compat flag must be enabled in Pages → Settings → Functions so that
// the handler can bridge context.env → process.env.
export { onRequest } from "../../src/features/quote/proxy/api/extract.js";
