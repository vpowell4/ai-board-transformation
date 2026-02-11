import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const startPort = Number(process.env.PORT || 8080);
const maxAttempts = 20;

function mimeType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function servePath(reqPath, res) {
  const normalized = reqPath === "/" ? "/index.html" : reqPath;
  const candidate = path.join(root, normalized);
  if (!candidate.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (!fs.existsSync(candidate) || fs.statSync(candidate).isDirectory()) {
    const fallback = path.join(root, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    fs.createReadStream(fallback).pipe(res);
    return;
  }
  res.writeHead(200, { "Content-Type": mimeType(candidate) });
  fs.createReadStream(candidate).pipe(res);
}

function startOn(port, attemptsLeft) {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      servePath(url.pathname, res);
    } catch {
      res.writeHead(500).end("Server error");
    }
  });

  server.on("error", (error) => {
    if (error && (error.code === "EADDRINUSE" || error.code === "EACCES") && attemptsLeft > 0) {
      startOn(port + 1, attemptsLeft - 1);
      return;
    }
    console.error("Failed to start static server:", error?.message || error);
    process.exit(1);
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}`);
  });
}

startOn(startPort, maxAttempts);
