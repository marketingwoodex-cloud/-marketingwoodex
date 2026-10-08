/* Woodex Admin v2.1 — dedicated preview on port 8083.
 * Redirects root `/` to `/admin-v2.1/` so the preview immediately loads the new v2.1 suite.
 */
import http from "node:http";

const UP = { host: "127.0.0.1", port: +(process.env.UP_PORT || 8080) };
const PORT = +(process.env.PORT || 8083);

const TO_V21 = ["/", "/index.html", "/admin-v2.1", "/admin-2.1"];

http
  .createServer((req, res) => {
    let p;
    try {
      p = new URL(req.url, "http://x").pathname;
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (TO_V21.includes(p)) {
      res.writeHead(302, { Location: "/admin-v2.1/", "Cache-Control": "no-store" });
      return res.end();
    }
    const pr = http.request(
      {
        ...UP,
        path: req.url,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${UP.port}` },
      },
      (pres) => {
        const headers = { ...pres.headers };
        if (p === "/admin-v2.1/" || /^\/admin-v2\.1\/[^?]*\.(css|js)$/.test(p)) {
          headers["cache-control"] = "no-store, must-revalidate";
          delete headers.etag;
        }
        res.writeHead(pres.statusCode, headers);
        pres.pipe(res);
      },
    );
    pr.on("error", () => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`The main server is not running on :${UP.port}. Start it first.\n`);
    });
    req.pipe(pr);
  })
  .listen(PORT, "0.0.0.0", () =>
    console.log(`v2.1 preview → :${PORT}   (/ → /admin-v2.1/ · forwards to :${UP.port})`),
  );
