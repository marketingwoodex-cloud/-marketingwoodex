import handler from "../netlify/functions/cms-estimator-leads.mjs";
import { vercelWrap } from "../netlify/functions/_vercel-adapter.mjs";

export default vercelWrap(handler);
