import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { URL } from "node:url";
import { fileURLToPath } from "node:url";
import { BOARD_ROLES } from "./src/roles.js";
import {
  BOOK_PRINCIPLES,
  BOOK_SOURCES,
  OBLONGIX_FRAMEWORK_STAGES,
  OBLONGIX_OUTCOME_DIMENSIONS,
} from "./src/books.js";
import { SCENARIOS, SECTORS } from "./src/scenarios.js";
import { createSession, applyUserTurn, buildClientState } from "./src/engine.js";
import { loadProfileFromDisk } from "./src/prompt-profile.js";
import { maybeRewriteBoardMessage } from "./src/llm.js";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".");
const PUBLIC_DIR = path.join(ROOT, "public");

const sessions = new Map();

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf8");
      if (body.length > 2_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function mimeType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function sendStatic(reqPath, res) {
  const normalized = reqPath === "/" ? "/index.html" : reqPath;
  const absolute = path.join(PUBLIC_DIR, normalized);
  if (!absolute.startsWith(PUBLIC_DIR)) {
    json(res, 403, { error: "Forbidden" });
    return;
  }
  if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory()) {
    json(res, 404, { error: "Not found" });
    return;
  }
  res.writeHead(200, { "Content-Type": mimeType(absolute) });
  fs.createReadStream(absolute).pipe(res);
}

async function handleStartSession(req, res) {
  try {
    const body = await parseBody(req);
    const tunedProfile = loadProfileFromDisk(ROOT);
    const state = createSession({
      roleId: body.roleId,
      sectorId: body.sectorId,
      scenarioId: body.scenarioId,
      companyName: body.companyName || "Northstar Holdings",
      seed: Number.isFinite(Number(body.seed)) ? Number(body.seed) : Date.now(),
      promptProfile: tunedProfile,
    });
    sessions.set(state.id, state);
    json(res, 200, {
      ok: true,
      session: buildClientState(state),
      tunedProfile,
    });
  } catch (error) {
    json(res, 400, { ok: false, error: error.message || "Failed to start session" });
  }
}

async function handleSessionMessage(req, res) {
  try {
    const body = await parseBody(req);
    const sessionId = String(body.sessionId || "");
    const state = sessions.get(sessionId);
    if (!state) {
      json(res, 404, { ok: false, error: "Session not found. Start a new simulation." });
      return;
    }

    const result = applyUserTurn(state, {
      optionId: body.optionId ? String(body.optionId) : null,
      message: body.message ? String(body.message) : "",
    });
    const rewritten = await maybeRewriteBoardMessage({
      state: buildClientState(state),
      boardMessage: result.boardMessage,
      userMessage: body.message || "",
      decision: result.acceptedDecision,
    });
    state.lastBoardMessage = rewritten;

    json(res, 200, {
      ok: true,
      acceptedDecision: result.acceptedDecision
        ? {
            id: result.acceptedDecision.id,
            title: result.acceptedDecision.title,
            principles: result.acceptedDecision.principles,
          }
        : null,
      incident: result.incident,
      scenarioEvent: result.scenarioEvent || null,
      session: buildClientState(state),
    });
  } catch (error) {
    json(res, 400, { ok: false, error: error.message || "Failed to process message" });
  }
}

function handleBootstrap(res) {
  json(res, 200, {
    ok: true,
    roles: BOARD_ROLES,
    principles: BOOK_PRINCIPLES,
    references: BOOK_SOURCES,
    frameworkStages: OBLONGIX_FRAMEWORK_STAGES,
    outcomeDimensions: OBLONGIX_OUTCOME_DIMENSIONS,
    sectors: SECTORS,
    scenarios: SCENARIOS,
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    handleBootstrap(res);
    return;
  }
  if (req.method === "POST" && pathname === "/api/session/start") {
    await handleStartSession(req, res);
    return;
  }
  if (req.method === "POST" && pathname === "/api/session/message") {
    await handleSessionMessage(req, res);
    return;
  }
  if (req.method === "GET") {
    sendStatic(pathname, res);
    return;
  }
  json(res, 404, { error: "Route not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`Board AI transformation simulator running at http://${HOST}:${PORT}`);
});
