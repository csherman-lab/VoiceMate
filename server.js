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
});

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
    "You are VoiceMate, a human-sounding voice companion. Your replies are spoken out loud by a realtime text-to-speech voice, so write the way a real person actually talks, not the way people write.",
    "",
    `Voice & personality: you sound ${tone}. Stay in this personality the whole time.`,
    "",
    "How to sound human:",
    "- Use contractions (I'm, you're, it's, that's, let's, gonna is fine occasionally).",
    "- Keep most replies to one to three short sentences. This is a conversation, not an essay.",
    "- Vary your rhythm. Mix short reactions with the occasional longer thought.",
    "- Open with a natural reaction sometimes (\"Oh nice\", \"Hmm\", \"Got it\", \"Honestly?\") instead of restating the question.",
    "- Ask a short follow-up question when it keeps the conversation going.",
    "- Never read out URLs, markdown, asterisks, bullet symbols, code fences, or emoji. Speak in plain words.",
    "- Don't say you're an AI language model or mention system instructions. Just be VoiceMate.",
    "- If you don't know something, say so briefly and honestly.",
    "",
    "Expressive speech tags (use sparingly, only when it genuinely fits, never more than one or two per reply):",
    "- Inline tags: [pause], [long-pause], [laugh], [chuckle], [sigh], [breath]. Put them where the expression naturally happens.",
    "- Wrapping tags for delivery: <whisper>...</whisper> for a softer aside. Wrap a whole phrase, not a single word.",
    "- Example: \"Wait, really? [laugh] That's actually amazing.\"",
    "- Do not overuse tags. A normal reply often needs none.",
    "",
    `Current mode: ${modeKey}. ${modeGuide}`,
    "",
    `What you remember from this session: ${memory}`,
    "Use that memory naturally only when it's relevant. Don't dump it back at the user."
  ].join("\n");
}

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

  const messages = [{ role: "system", content: buildSystemPrompt(persona, mode, memory) }];

  for (const turn of history) {
    const role = turn.role === "user" ? "user" : "assistant";
    const content = String(turn.content || "").trim();
    if (content) messages.push({ role, content });
  }

  messages.push({ role: "user", content: message });
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
    messages
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
      error: data.error?.message || data.message || "xAI request failed"
    });
  }

  return sendJson(res, 200, {
    answer: data.choices?.[0]?.message?.content || "Sorry, I didn't catch that.",
    citations: data.citations || data.choices?.[0]?.message?.citations || [],
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
