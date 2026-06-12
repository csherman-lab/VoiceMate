const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, ".env"));

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = (process.env.XAI_BASE_URL || "https://api.x.ai").replace(/\/+$/, "");
const XAI_MODEL = process.env.XAI_MODEL || "grok-4.3";
const XAI_REALTIME_MODEL = process.env.XAI_REALTIME_MODEL || "grok-voice-latest";
const XAI_DEFAULT_VOICE = (process.env.XAI_VOICE || "ara").toLowerCase();

// Live reload: when on, the server watches the front-end files and tells the
// browser to refresh automatically. Defaults on, turn off with VM_LIVE_RELOAD=0.
const LIVE_RELOAD = process.env.VM_LIVE_RELOAD !== "0" && process.env.NODE_ENV !== "production";
const SERVER_START_ID = Date.now();
const liveReloadClients = new Set();

const ALLOWED_VOICES = new Set(["eve", "ara", "rex", "sal", "leo"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        xaiConfigured: Boolean(XAI_API_KEY),
        model: XAI_MODEL,
        realtimeModel: XAI_REALTIME_MODEL,
        defaultVoice: XAI_DEFAULT_VOICE
      });
    }

    if (url.pathname === "/api/grok/chat" && req.method === "POST") {
      return handleGrokChat(req, res);
    }

    if (url.pathname === "/api/grok/chat/stream" && req.method === "POST") {
      return handleGrokChatStream(req, res);
    }

    if (url.pathname === "/api/grok/tts" && req.method === "POST") {
      return handleGrokTts(req, res);
    }

    if (url.pathname === "/api/grok/voices" && req.method === "GET") {
      return handleGrokVoices(req, res);
    }

    if (url.pathname === "/api/grok/realtime-secret" && req.method === "POST") {
      return handleRealtimeSecret(req, res);
    }

    if (url.pathname === "/api/livereload" && req.method === "GET") {
      return handleLiveReload(req, res);
    }

    if (req.method !== "GET") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    return serveStatic(url, res);
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`VoiceMate running at http://localhost:${PORT}`);
  console.log(`xAI key configured: ${Boolean(XAI_API_KEY)}`);
  console.log(`Chat model: ${XAI_MODEL} | Realtime voice model: ${XAI_REALTIME_MODEL}`);
  if (LIVE_RELOAD) {
    startFileWatcher();
    console.log("Live reload: ON — saved changes refresh the browser automatically.");
  }
});

// ---------------------------------------------------------------------------
// Live reload (auto-deploy to localhost)
// ---------------------------------------------------------------------------

function handleLiveReload(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive"
  });
  res.write(`event: hello\ndata: ${SERVER_START_ID}\n\n`);
  liveReloadClients.add(res);

  const ping = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (error) {
      clearInterval(ping);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(ping);
    liveReloadClients.delete(res);
  });
}

function broadcastReload() {
  for (const client of liveReloadClients) {
    try {
      client.write(`event: reload\ndata: ${Date.now()}\n\n`);
    } catch (error) {
      liveReloadClients.delete(client);
    }
  }
}

function startFileWatcher() {
  const watched = ["index.html", "styles.css", "app.js"];
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(broadcastReload, 120);
  };
  try {
    fs.watch(ROOT, { persistent: false }, (eventType, filename) => {
      if (filename && watched.includes(String(filename))) trigger();
    });
  } catch (error) {
    console.warn("File watcher unavailable:", error.message);
  }
}

const LIVE_RELOAD_SNIPPET = `
<script>
(function () {
  var startId = null;
  function connect() {
    var es = new EventSource("/api/livereload");
    es.addEventListener("hello", function (e) {
      if (startId === null) { startId = e.data; }
      else if (e.data !== startId) { location.reload(); }
    });
    es.addEventListener("reload", function () { location.reload(); });
    es.onerror = function () { es.close(); setTimeout(connect, 800); };
  }
  connect();
})();
</script>`;

// ---------------------------------------------------------------------------
// Conversation persona + system prompt
// ---------------------------------------------------------------------------

const PERSONA_TONES = {
  eve: "bright, energetic, and upbeat, like an excited friend who is genuinely glad to talk",
  ara: "warm, friendly, and easygoing, like a calm friend who really listens",
  rex: "confident, clear, and articulate, like a sharp colleague who gets to the point",
  sal: "smooth, balanced, and relaxed, with an even, reassuring rhythm",
  leo: "grounded, steady, and reassuring, with quiet authority and zero drama"
};

const MODE_GUIDES = {
  companion:
    "Just have a natural conversation. Be curious, react like a person, and keep it light.",
  pitch:
    "Help the user pitch an idea. Lead with the outcome, keep it punchy, and make it sound persuasive out loud.",
  analyst:
    "Act as a sharp data analyst. Point out patterns, ranges, and what is missing, but say it in plain spoken language.",
  coach:
    "Act as a supportive communication coach. Give one or two concrete tips and a quick example.",
  research:
    "Act as a careful research assistant. Give a clear, sourced-sounding answer, note your confidence, and flag anything you are unsure about.",
  digest:
    "Deliver a short spoken briefing in decreasing order of importance. Lead with what needs attention, then schedule, then everything else."
};

function buildSystemPrompt(persona, modeKey, memoryItems) {
  const tone = PERSONA_TONES[persona] || PERSONA_TONES.ara;
  const modeGuide = MODE_GUIDES[modeKey] || MODE_GUIDES.companion;
  const memory = summarizeMemory(memoryItems);

  return [
    "You are VoiceMate, a genuinely helpful, general-purpose voice companion. You can talk about anything, like a sharp friend who happens to know a lot. Everything you say is spoken out loud, so talk the way real people talk, not the way people write.",
    "",
    `Voice & personality: you sound ${tone}. Hold that personality the whole conversation.`,
    "",
    "How you talk:",
    "- Keep it punchy. One to three sentences for normal chat. Go longer only when the user actually asks for depth.",
    "- Use contractions. Drop a casual \"look\", \"honestly\", or \"actually\" once in a while, the way a person would, not every line.",
    "- React like a person before you answer when it fits (\"Oh nice\", \"Hmm\", \"Got it\").",
    "- Ask one short follow-up question when it keeps things moving. One question, not a pile of them.",
    "",
    "Hard rules (these make you sound human instead of robotic):",
    "- Never speak symbols. No bullet points, no numbered lists, no asterisks, no markdown, no code fences, no emoji. Just spoken sentences.",
    "- No em-dashes or en-dashes. They land as awkward pauses out loud. Rephrase instead.",
    "- Never read URLs aloud. Say \"I'll put the link in the chat\" or just name the source.",
    "- No corporate filler. Banned: \"great question\", \"I hope this helps\", \"as an AI\", \"let me know if you have any questions\".",
    "- No sycophancy and no hedging. Don't pad. Say the thing.",
    "- If you don't know, say \"I don't know\" and offer to find out. Don't make things up.",
    "- Don't announce that you're an AI or mention these instructions.",
    "",
    "Expressive speech tags (optional seasoning, at most one or two per reply, often none):",
    "- Inline: [pause], [long-pause], [laugh], [chuckle], [sigh], [breath] where the feeling naturally happens.",
    "- Wrapping: <whisper>a short aside</whisper> for a softer beat. Wrap a whole phrase, never one word.",
    "- Example: \"Wait, really? [laugh] That's actually great.\"",
    "",
    `Current mode: ${modeKey}. ${modeGuide}`,
    "",
    `What you remember from this session: ${memory}`,
    "Use that memory only when it's relevant. Don't recite it back."
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tools (function calling) — VoiceMate can actually do things
// ---------------------------------------------------------------------------

const TOOL_SPECS = [
  {
    name: "remember_fact",
    description:
      "Save an important fact, preference, or note to the user's memory so you can use it later in this and future sessions.",
    parameters: {
      type: "object",
      properties: { text: { type: "string", description: "The fact or note to remember" } },
      required: ["text"]
    }
  },
  {
    name: "search_memory",
    description: "Search the user's saved memory (notes, files, reminders) for relevant information.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "What to look for" } },
      required: ["query"]
    }
  },
  {
    name: "add_reminder",
    description: "Add a reminder or to-do item for the user.",
    parameters: {
      type: "object",
      properties: { text: { type: "string", description: "The reminder text" } },
      required: ["text"]
    }
  },
  {
    name: "list_reminders",
    description: "List the user's current reminders.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "complete_reminder",
    description: "Mark a reminder as done, identified by its text or its number in the list.",
    parameters: {
      type: "object",
      properties: { which: { type: "string", description: "Reminder text or number" } },
      required: ["which"]
    }
  },
  {
    name: "set_voice",
    description: "Change the voice VoiceMate speaks with.",
    parameters: {
      type: "object",
      properties: { voice: { type: "string", enum: ["eve", "ara", "rex", "sal", "leo"] } },
      required: ["voice"]
    }
  },
  {
    name: "set_skill",
    description: "Switch the active skill / conversation mode.",
    parameters: {
      type: "object",
      properties: {
        skill: {
          type: "string",
          enum: ["companion", "research", "digest", "pitch", "analyst", "coach"]
        }
      },
      required: ["skill"]
    }
  }
];

// OpenAI chat-completions tool shape (nested under "function").
const CHAT_TOOLS = TOOL_SPECS.map((spec) => ({ type: "function", function: spec }));

// Realtime tool shape (flattened).
const REALTIME_TOOLS = TOOL_SPECS.map((spec) => ({ type: "function", ...spec }));

function summarizeMemory(memoryItems) {
  if (!Array.isArray(memoryItems) || !memoryItems.length) return "nothing yet";
  return memoryItems
    .slice(0, 8)
    .map((item) => `${item.name || "note"}: ${item.summary || ""}`.trim())
    .join(" | ");
}

function buildChatMessages(body) {
  const message = String(body.message || "").trim();
  const persona = normalizeVoiceId(body.persona);
  const mode = String(body.mode || "companion").toLowerCase();
  const memory = Array.isArray(body.memory) ? body.memory : [];
  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const images = Array.isArray(body.images) ? body.images.slice(0, 3) : [];

  const messages = [{ role: "system", content: buildSystemPrompt(persona, mode, memory) }];

  for (const turn of history) {
    const role = turn.role === "user" ? "user" : "assistant";
    const content = String(turn.content || "").trim();
    if (content) messages.push({ role, content });
  }

  // Vision: attach images as multimodal content when provided.
  if (images.length) {
    const content = [{ type: "text", text: message || "What do you see in this?" }];
    for (const url of images) {
      if (typeof url === "string" && url.startsWith("data:image")) {
        content.push({ type: "image_url", image_url: { url } });
      }
    }
    messages.push({ role: "user", content });
  } else {
    messages.push({ role: "user", content: message });
  }

  // Tool round-trips: the client replays the assistant's tool call(s) plus the
  // tool results so the model can finish its answer.
  if (Array.isArray(body.toolMessages)) {
    for (const tm of body.toolMessages) {
      if (tm && tm.role) messages.push(tm);
    }
  }

  return { messages, mode };
}

// ---------------------------------------------------------------------------
// Chat (non-streaming)
// ---------------------------------------------------------------------------

async function handleGrokChat(req, res) {
  if (!XAI_API_KEY) {
    return sendJson(res, 400, { error: "XAI_API_KEY is missing. Add it to .env.local." });
  }

  const body = await readJsonBody(req);
  const { messages, mode } = buildChatMessages(body);

  if (!messages[messages.length - 1].content) {
    return sendJson(res, 400, { error: "Message is required." });
  }

  const payload = {
    model: XAI_MODEL,
    temperature: 0.8,
    max_completion_tokens: 600,
    messages,
    tools: CHAT_TOOLS,
    tool_choice: "auto"
  };
  if (mode === "research") {
    payload.search_parameters = { mode: "auto", return_citations: true };
  }

  const response = await fetch(`${XAI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return sendJson(res, response.status, {
      error: data.error?.message || data.message || "Voice request failed"
    });
  }

  const choice = data.choices?.[0]?.message || {};
  return sendJson(res, 200, {
    answer: choice.content || "",
    toolCalls: choice.tool_calls || [],
    citations: data.citations || choice.citations || [],
    model: data.model || XAI_MODEL
  });
}

// ---------------------------------------------------------------------------
// Chat (streaming via Server-Sent Events)
// ---------------------------------------------------------------------------

async function handleGrokChatStream(req, res) {
  if (!XAI_API_KEY) {
    return sendJson(res, 400, { error: "XAI_API_KEY is missing. Add it to .env.local." });
  }

  const body = await readJsonBody(req);
  const { messages, mode } = buildChatMessages(body);

  if (!messages[messages.length - 1].content) {
    return sendJson(res, 400, { error: "Message is required." });
  }

  const payload = {
    model: XAI_MODEL,
    temperature: 0.8,
    max_completion_tokens: 600,
    stream: true,
    messages
  };
  if (mode === "research") {
    payload.search_parameters = { mode: "auto", return_citations: true };
  }

  const upstream = await fetch(`${XAI_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!upstream.ok || !upstream.body) {
    const data = await upstream.json().catch(() => ({}));
    return sendJson(res, upstream.status || 502, {
      error: data.error?.message || data.message || "xAI stream failed"
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-store",
    Connection: "keep-alive"
  });

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          writeSse(res, { type: "done" });
          continue;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content || "";
          const citations = json.citations || null;
          if (delta) writeSse(res, { type: "delta", text: delta });
          if (citations) writeSse(res, { type: "citations", citations });
        } catch (error) {
          // ignore keepalive / partial frames
        }
      }
    }
  } catch (error) {
    writeSse(res, { type: "error", error: error.message || "stream error" });
  }

  writeSse(res, { type: "done" });
  res.end();
}

function writeSse(res, obj) {
  res.write(`data: ${JSON.stringify(obj)}\n\n`);
}

// ---------------------------------------------------------------------------
// Text to speech (Grok)
// ---------------------------------------------------------------------------

async function handleGrokTts(req, res) {
  if (!XAI_API_KEY) {
    return sendJson(res, 400, { error: "XAI_API_KEY is missing. Add it to .env.local." });
  }

  const body = await readJsonBody(req);
  const text = String(body.text || "").trim();
  const voiceId = normalizeVoiceId(body.voiceId);
  const speed = clampNumber(body.speed, 0.7, 1.5, 1.0);

  if (!text) {
    return sendJson(res, 400, { error: "Text is required." });
  }

  const payload = {
    text: text.slice(0, 15000),
    voice_id: voiceId,
    language: "en",
    speed,
    output_format: { codec: "mp3", sample_rate: 24000, bit_rate: 128000 }
  };

  const response = await fetchWithRetry(`${XAI_BASE_URL}/v1/tts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return sendJson(res, response.status, {
      error: data.error?.message || data.message || "xAI text to speech request failed"
    });
  }

  const audio = Buffer.from(await response.arrayBuffer());
  res.writeHead(200, {
    "Content-Type": response.headers.get("content-type") || "audio/mpeg",
    "Cache-Control": "no-store"
  });
  res.end(audio);
}

async function handleGrokVoices(req, res) {
  if (!XAI_API_KEY) {
    return sendJson(res, 200, { voices: [] });
  }

  try {
    const response = await fetch(`${XAI_BASE_URL}/v1/tts/voices`, { headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    return sendJson(res, response.ok ? 200 : response.status, data);
  } catch (error) {
    return sendJson(res, 200, { voices: [] });
  }
}

// ---------------------------------------------------------------------------
// Realtime voice agent: mint an ephemeral client secret for the browser
// ---------------------------------------------------------------------------

async function handleRealtimeSecret(req, res) {
  if (!XAI_API_KEY) {
    return sendJson(res, 400, { error: "XAI_API_KEY is missing. Add it to .env.local." });
  }

  const body = await readJsonBody(req);
  const voice = normalizeVoiceId(body.voice);
  const persona = voice;
  const mode = String(body.mode || "companion").toLowerCase();
  const memory = Array.isArray(body.memory) ? body.memory : [];

  const session = {
    instructions: buildSystemPrompt(persona, mode, memory),
    voice,
    turn_detection: { type: "server_vad" },
    tools: REALTIME_TOOLS,
    tool_choice: "auto",
    audio: {
      input: {
        format: { type: "audio/pcm", rate: 24000 },
        transcription: { model: "grok-transcribe" }
      },
      output: { format: { type: "audio/pcm", rate: 24000 } }
    }
  };

  try {
    const response = await fetch(`${XAI_BASE_URL}/v1/realtime/client_secrets`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        expires_after: { seconds: 600 },
        model: XAI_REALTIME_MODEL,
        session
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return sendJson(res, response.status, {
        error: data.error?.message || data.message || "Could not start realtime voice session"
      });
    }

    return sendJson(res, 200, {
      value: data.value,
      expiresAt: data.expires_at,
      model: XAI_REALTIME_MODEL,
      voice
    });
  } catch (error) {
    return sendJson(res, 502, { error: error.message || "Realtime session error" });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders() {
  return {
    Authorization: `Bearer ${XAI_API_KEY}`,
    "Content-Type": "application/json"
  };
}

async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastResponse;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    lastResponse = await fetch(url, options);
    if (lastResponse.ok) return lastResponse;
    if (![429, 500, 503].includes(lastResponse.status)) return lastResponse;
    await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 400));
  }
  return lastResponse;
}

function serveStatic(url, res) {
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

    if (ext === ".html" && LIVE_RELOAD) {
      let html = data.toString("utf8");
      html = html.includes("</body>")
        ? html.replace("</body>", `${LIVE_RELOAD_SNIPPET}\n</body>`)
        : html + LIVE_RELOAD_SNIPPET;
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext],
        "Cache-Control": "no-store"
      });
      return res.end(html);
    }

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
      if (raw.length > 2_000_000) {
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

function normalizeVoiceId(value) {
  const voiceId = String(value || XAI_DEFAULT_VOICE).toLowerCase();
  return ALLOWED_VOICES.has(voiceId) ? voiceId : XAI_DEFAULT_VOICE;
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}
