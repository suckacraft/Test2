// crm-project root: /functions/api/feedback.js
// Cloudflare Pages Functions entry — maps /api/feedback (durable corpus).
import { cf } from "../../src/features/quote/proxy/api/feedbackHttp.js";
export const onRequest = cf("feedback");
