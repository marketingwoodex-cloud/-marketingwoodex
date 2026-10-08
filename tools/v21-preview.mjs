/* Woodex Admin v2.1 — dedicated preview on port 8083.
 * Transparently maps all requests to `/admin-v2.1/` while keeping `/api/` and `/assets/` intact.
 */
import http from "node:http";

const UP = { host: "127.0.0.1", port: +(process.env.UP_PORT || 8080) };
const PORT = +(process.env.PORT || 8083);

http
  .createServer((req, res) => {
    let p;
    try {
      p = new URL(req.url, "http://x").pathname;
    } catch {
      res.writeHead(400);
      return res.end();
    }
    
    let targetPath = req.url;
    if (p === "/" || p === "/index.html") {
      targetPath = "/admin-v2.1/";
    } else if (!p.startsWith("/api/") && !p.startsWith("/assets/") && !p.startsWith("/admin-v2.1/")) {
      targetPath = "/admin-v2.1" + (req.url.startsWith("/") ? req.url : "/" + req.url);
    }

    const pr = http.request(
      {
        ...UP,
        path: targetPath,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${UP.port}` },
      },
      (pres) => {
        const headers = { ...pres.headers };
        headers["cache-control"] = "no-store, must-revalidate";
        delete headers.etag;
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
    console.log(`v2.1 preview → :${PORT}   (transparent /admin-v2.1/ forwarding)`),
  );
