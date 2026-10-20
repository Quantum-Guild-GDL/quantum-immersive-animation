import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT) || 8080;
const root = process.cwd();
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const relative = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, relative === "/" ? "index.html" : relative);
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, "index.html");
    if (extname(filePath) === ".mp4") {
      const size = info.size;
      let start = 0;
      let end = size - 1;
      if (request.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
        if (!range || (!range[1] && !range[2])) {
          response.writeHead(416, { "Content-Range": `bytes */${size}` }); response.end(); return;
        }
        if (!range[1]) start = Math.max(0, size - Number(range[2]));
        else { start = Number(range[1]); if (range[2]) end = Math.min(end, Number(range[2])); }
        if (start > end || start >= size) {
          response.writeHead(416, { "Content-Range": `bytes */${size}` }); response.end(); return;
        }
      }
      const headers = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Cache-Control": "no-cache" };
      if (request.headers.range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      response.writeHead(request.headers.range ? 206 : 200, headers);
      if (request.method === "HEAD") { response.end(); return; }
      const stream = createReadStream(filePath, { start, end });
      stream.on("error", () => response.destroy());
      response.on("close", () => stream.destroy());
      stream.pipe(response);
      return;
    }
    const data = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`Quantum Cat Journey running at http://localhost:${port}`);
});

