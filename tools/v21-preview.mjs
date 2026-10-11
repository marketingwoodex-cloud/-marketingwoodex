// tools/v21-preview.mjs - Dedicated Admin v2.1 Preview Server on Port 8083
// Forwards / directly to /admin/ and proxies API calls to port 8080.
import http from "node:http";

const TARGET_PORT = 8080;
const PORT = Number(process.env.PORT || 8083);

const server = http.createServer((req, res) => {
  let targetPath = req.url;
  if (targetPath === "/" || targetPath === "") {
    targetPath = "/admin/";
  } else if (!targetPath.startsWith("/admin/") && !targetPath.startsWith("/api/") && !targetPath.startsWith("/assets/") && !targetPath.startsWith("/builder/")) {
    targetPath = "/admin" + (targetPath.startsWith("/") ? "" : "/") + targetPath;
  }

  const options = {
    hostname: "127.0.0.1",
    port: TARGET_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${TARGET_PORT}` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Admin Preview Proxy Error: " + err.message);
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Woodex Admin v2.1 Preview running on http://0.0.0.0:${PORT}/`);
});
