// crm-project root: /functions/api/golden.js
// Cloudflare Pages Functions entry — maps /api/golden (eval golden set).
import { cf } from "../../src/features/quote/proxy/api/feedbackHttp.js";
export const onRequest = cf("golden");
