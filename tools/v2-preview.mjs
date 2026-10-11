/* Woodex Admin v2 — dedicated preview on port 8082.
 * Redirects root `/` to `/admin/` so the preview immediately loads the untouched v2 Admin.
 */
import http from "node:http";

const UP = { host: "127.0.0.1", port: +(process.env.UP_PORT || 8080) };
const PORT = +(process.env.PORT || 8082);

const TO_V2 = ["/", "/index.html"];

http
  .createServer((req, res) => {
    let p;
    try {
      p = new URL(req.url, "http://x").pathname;
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (TO_V2.includes(p)) {
      res.writeHead(302, { Location: "/admin/", "Cache-Control": "no-store" });
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
        res.writeHead(pres.statusCode, pres.headers);
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
    console.log(`v2 preview → :${PORT}   (/ → /admin/ · forwards to :${UP.port})`),
  );
