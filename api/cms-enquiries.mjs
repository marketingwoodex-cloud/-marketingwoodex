import handler from "../netlify/functions/cms-enquiries.mjs";
import { vercelWrap } from "../netlify/functions/_vercel-adapter.mjs";

export default vercelWrap(handler);
