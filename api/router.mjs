// api/router.mjs — SINGLE Vercel serverless function for the whole CMS backend.
// Vercel Hobby caps deployments at 12 serverless functions, and the dashboard
// needs 16 endpoints, so every backend call is routed through this one function.
// vercel.json rewrites /.netlify/functions/<name> -> /api/router?fn=<name>
// (original query strings are preserved by Vercel and merged in).
// The real logic still lives untouched in netlify/functions/*.mjs.
import { vercelWrap } from "../netlify/functions/_vercel-adapter.mjs";
import cmsAuth from "../netlify/functions/cms-auth.mjs";
import cmsBlogPosts from "../netlify/functions/cms-blog-posts.mjs";
import cmsDelete from "../netlify/functions/cms-delete.mjs";
import cmsEnquiries from "../netlify/functions/cms-enquiries.mjs";
import cmsEstimatorLeads from "../netlify/functions/cms-estimator-leads.mjs";
import cmsInvoices from "../netlify/functions/cms-invoices.mjs";
import cmsMedia from "../netlify/functions/cms-media.mjs";
import cmsProjects from "../netlify/functions/cms-projects.mjs";
import cmsQuotationTemplates from "../netlify/functions/cms-quotation-templates.mjs";
import cmsQuotations from "../netlify/functions/cms-quotations.mjs";
import cmsSave from "../netlify/functions/cms-save.mjs";
import cmsSettings from "../netlify/functions/cms-settings.mjs";
import cmsStats from "../netlify/functions/cms-stats.mjs";
import cmsTeam from "../netlify/functions/cms-team.mjs";
import cmsUpload from "../netlify/functions/cms-upload.mjs";
import cmsUsers from "../netlify/functions/cms-users.mjs";
import enquirySubmit from "../netlify/functions/enquiry-submit.mjs";
import estimatorSubmit from "../netlify/functions/estimator-submit.mjs";

const HANDLERS = {
  "cms-auth": cmsAuth,
  "cms-blog-posts": cmsBlogPosts,
  "cms-delete": cmsDelete,
  "cms-enquiries": cmsEnquiries,
  "cms-estimator-leads": cmsEstimatorLeads,
  "cms-invoices": cmsInvoices,
  "cms-media": cmsMedia,
  "cms-projects": cmsProjects,
  "cms-quotation-templates": cmsQuotationTemplates,
  "cms-quotations": cmsQuotations,
  "cms-save": cmsSave,
  "cms-settings": cmsSettings,
  "cms-stats": cmsStats,
  "cms-team": cmsTeam,
  "cms-upload": cmsUpload,
  "cms-users": cmsUsers,
  "enquiry-submit": enquirySubmit,
  "estimator-submit": estimatorSubmit,
};

async function router(req, res) {
  let fn = "";
  try {
    fn = new URL(req.url || "/", "http://local").searchParams.get("fn") || "";
  } catch {}
  const handler = HANDLERS[fn];
  if (!handler) {
    res.statusCode = 404;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: "Unknown API function." }));
    return;
  }
  return vercelWrap(handler)(req, res);
}

export default router;
