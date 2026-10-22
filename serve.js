const http = require("node:http");
const path = require("node:path");
const { readFile } = require("node:fs/promises");

const host = "127.0.0.1";
const port = Number(process.env.PORT) || 8765;
const root = __dirname;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${host}:${port}`);
    const requestedPath =
      requestUrl.pathname === "/"
        ? "index.html"
        : decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
    const filePath = path.resolve(root, requestedPath);

    if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    const contentType =
      contentTypes[path.extname(filePath).toLowerCase()] ??
      "application/octet-stream";

    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    const statusCode = error.code === "ENOENT" ? 404 : 500;
    response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(statusCode === 404 ? "Not found" : "Server error");
  }
});

server.listen(port, host, () => {
  console.log(`拾光备忘录已启动：http://${host}:${port}`);
});
