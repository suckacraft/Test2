// crm-project root: /api/golden.js
// Vercel / Netlify-node serverless entry — eval golden-set endpoint.
import { vercel } from "../src/features/quote/proxy/api/feedbackHttp.js";
export default vercel("golden");
