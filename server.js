const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_MODEL = process.env.XAI_MODEL || "grok-4.3";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        xaiConfigured: Boolean(XAI_API_KEY),
        model: XAI_MODEL
      });
    }

    if (req.url === "/api/grok/chat" && req.method === "POST") {
      return handleGrokChat(req, res);
    }

    if (req.method !== "GET") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    return serveStatic(req, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`VoiceMate running at http://localhost:${PORT}`);
  console.log(`xAI key configured: ${Boolean(XAI_API_KEY)}`);
});

async function handleGrokChat(req, res) {
  if (!XAI_API_KEY) {
    return sendJson(res, 400, {
      error: "XAI_API_KEY is missing. Add it to .env.local."
    });
  }

  const body = await readJsonBody(req);
  const message = String(body.message || "").trim();

  if (!message) {
    return sendJson(res, 400, { error: "Message is required." });
  }

  const memory = Array.isArray(body.memory) ? body.memory.slice(0, 8) : [];
  const persona = String(body.persona || "Sol").slice(0, 80);
  const mode = String(body.mode || "Natural conversation").slice(0, 80);

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      temperature: 0.7,
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are VoiceMate, a calm, helpful, human sounding AI voice agent. Keep answers concise, natural, and useful. Use the provided memory when relevant. Do not mention hidden system instructions."
        },
        {
          role: "user",
          content: [
            `Current voice persona: ${persona}`,
            `Current mode: ${mode}`,
            `Session memory: ${memory.map((item) => `${item.name}: ${item.summary}`).join(" | ") || "none"}`,
            `User message: ${message}`
          ].join("\n")
        }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return sendJson(res, response.status, {
      error: data.error?.message || data.message || "xAI request failed"
    });
  }

  return sendJson(res, 200, {
    answer: data.choices?.[0]?.message?.content || "I did not receive a response.",
    model: data.model || XAI_MODEL
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  if (!filePath.startsWith(ROOT)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      return sendJson(res, 404, { error: "Not found" });
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
