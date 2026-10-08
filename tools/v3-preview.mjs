/* Woodex Admin v3 — dedicated preview.
 *
 * Port 8080 keeps serving the site exactly as before, with Admin v2 at /admin/
 * (untouched). This wrapper runs on its own port (default 8081) and forwards
 * every request to that server, except that /, /admin, /admin/ and
 * /admin/index.html are redirected to /admin-v3/ — so whatever you type into
 * the address bar, you land on the new admin.
 *
 *   run: node tools/v3-preview.mjs          (PORT=8081)
 */
import http from "node:http";

const UP = { host: "127.0.0.1", port: +(process.env.UP_PORT || 8080) };
const PORT = +(process.env.PORT || 8081);

// paths that should always land on the v3 admin
const TO_V3 = ["/", "/admin", "/admin/", "/admin/index.html", "/admin.html"];

http
  .createServer((req, res) => {
    let p;
    try {
      p = new URL(req.url, "http://x").pathname;
    } catch {
      res.writeHead(400);
      return res.end();
    }
    if (TO_V3.includes(p)) {
      res.writeHead(302, { Location: "/admin-v3/", "Cache-Control": "no-store" });
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
        // Never let a stale v3 shell or asset survive a theme change: the
        // browser has cached an old v3.css before and kept showing the
        // previous palette. The ?v=<hash> on the asset links covers
        // production; this covers anyone hitting the preview directly.
        const headers = { ...pres.headers };
        if (p === "/admin-v3/" || /^\/admin-v3\/[^?]*\.(css|js)$/.test(p)) {
          headers["cache-control"] = "no-store, must-revalidate";
          delete headers.etag;
        }
        res.writeHead(pres.statusCode, headers);
        pres.pipe(res);
      },
    );
    pr.on("error", () => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`The main preview is not running on :${UP.port}. Start it first:\n  node tools/frontend-v1-server.mjs\n`);
    });
    req.pipe(pr);
  })
  .listen(PORT, "0.0.0.0", () =>
    console.log(`v3 preview → :${PORT}   (/, /admin* → /admin-v3/ · everything else → :${UP.port})`),
  );
