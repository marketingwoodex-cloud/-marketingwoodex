// _vercel-adapter.mjs — lets the existing Netlify-style CMS functions
// (export default async (req: Request) => Response) run unchanged on Vercel's
// Node.js serverless runtime, which calls (req, res) instead.
// Each file in /api/ is a one-line wrapper around this.
export function vercelWrap(handler) {
  return async (req, res) => {
    try {
      const proto = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers.host || "localhost";
      const url = `${proto}://${host}${req.url || "/"}`;
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers || {})) {
        if (v === undefined) continue;
        try { headers.set(k, Array.isArray(v) ? v.join(", ") : String(v)); } catch {}
      }
      const method = (req.method || "GET").toUpperCase();
      let body;
      if (method !== "GET" && method !== "HEAD") {
        body = await new Promise((resolve, reject) => {
          const chunks = [];
          req.on("data", (c) => chunks.push(c));
          req.on("end", () => resolve(Buffer.concat(chunks)));
          req.on("error", reject);
        });
      }
      const webReq = new Request(url, { method, headers, body });
      const webRes = await handler(webReq);
      res.statusCode = webRes.status;
      webRes.headers.forEach((v, k) => {
        try { res.setHeader(k, v); } catch {}
      });
      res.end(Buffer.from(await webRes.arrayBuffer()));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: "Function failed." }));
    }
  };
}
