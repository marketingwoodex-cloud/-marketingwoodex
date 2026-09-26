import handler from "../netlify/functions/cms-upload.mjs";
import { vercelWrap } from "../netlify/functions/_vercel-adapter.mjs";

export default vercelWrap(handler);
