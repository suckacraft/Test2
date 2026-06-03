// crm-project root: /api/feedback.js
// Vercel / Netlify-node serverless entry — corpus feedback endpoint.
import { vercel } from "../src/features/quote/proxy/api/feedbackHttp.js";
export default vercel("feedback");
