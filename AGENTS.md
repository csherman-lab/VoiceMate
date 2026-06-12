# VoiceMate — Agent / AI Session Notes

> Read this before reading any other file. It replaces the need to explore the repo cold.

## What this project is

VoiceMate is a voice companion web app (PWA). Users type or speak; it replies in a chosen AI voice. Think of it as a personal Jarvis running in the browser.

Two run modes:
- **Static** (`open-voicemate.html`) — no server, browser TTS, zero API cost.
- **Backend** (`npm start`) — Node server proxies xAI for chat, streaming, TTS, and live realtime voice (WebSocket).

## Tech stack

- **Runtime**: Node.js 18+, zero npm dependencies (uses Node built-ins only)
- **Backend**: `server.js` — plain `http` module, native `fetch` to xAI
- **Frontend**: `app.js`, `styles.css`, `index.html` — vanilla JS/CSS/HTML, no framework
- **AI provider**: xAI (Grok) only — chat, TTS, realtime voice, vision
- **Storage**: localStorage + IndexedDB (client-side only, no server DB)
- **Build**: `node build-singlefile.js` inlines everything into `open-voicemate.html`

## File map

| File | Size | What it does |
|---|---|---|
| `server.js` | 923 lines | All API routes, system prompt, tool specs, memory summarization |
| `app.js` | 4,250 lines | All client logic: UI, chat, TTS, live voice, memory, tools |
| `styles.css` | 3,281 lines | Apple-style PWA theme, dark mode, orb animations |
| `index.html` | 426 lines | HTML shell, page structure, SVG icons |
| `.env.local.example` | — | All env vars with comments |
| `build-singlefile.js` | — | Inline bundler (no webpack) |
| `open-voicemate.html` | generated | Single-file offline build |

## Branch history

| Branch | Version | Status |
|---|---|---|
| `cursor/file-image-context-fbd0` | v0.4.0 | **Active development base** |
| `cursor/reduce-cloud-tokens-bee4` | — | Draft PR off v0.4 — token cost cuts |
| `cursor/voicemate-v1-c560` | v0.2.0 | Older, stable |
| `cursor/deft-voice-agent-6fb4` | v0.1 | Early prototype |
| `main` | — | Just a README, no app code |

**Always branch off `cursor/file-image-context-fbd0` unless told otherwise.**

## Key server.js landmarks

```
L11–19   env var constants (XAI_MODEL, VM_ENRICH_IMAGES, VM_BROWSER_TTS, …)
L69–111  request router
L133     authorizeApi() — rate limit (60/min/IP) + optional token check
L227     PERSONA_TONES — voice personality strings
L235     MODE_GUIDES — per-skill system prompt additions
L250     buildSystemPrompt() — assembles full system prompt
L295     TOOL_SPECS — all 12 function-call tool definitions
L414     summarizeMemory() — picks up to 8 items, 600-char excerpts
L438     buildChatMessages() — history (6 turns), images (3 max), toolMessages
L497     handleGrokChat() — non-streaming chat
L548     handleGrokChatStream() — SSE streaming chat (primary path)
L669     handleGrokTts() — text-to-speech proxy
L739     handleRealtimeSecret() — mints ephemeral WebSocket token
```

## Key app.js landmarks

```
L221     state{} — all runtime state (backendOnline, enrichImages, browserTts, …)
L269     cacheEls() — DOM element cache
L345     init() — startup, loads saved state, calls checkBackend()
L635     routeFiles() — handles file/image/CSV uploads
L865     showPage() — navigation
L901     startTalkSession() / endTalkSession()
L1167    detectSkill() — intent routing to mode
L1238    handlePrompt() — entry point for every user message
L1263    respond() — orchestrates chat + TTS for typed messages
L1306    chatAgent() — tool-call loop (max 2 rounds)
L1356    streamChatRound() — single SSE fetch to /api/grok/chat/stream
L1434    executeTool() — runs tool calls client-side
L1626    answerPrompt() — local rule-based fallback (no backend)
L1699    speak() — TTS: cache → xAI TTS → browser fallback
L1795    speakWithBrowser() — browser speechSynthesis
L1877    shareMemoryWithLive() — pushes memory into realtime session
L3055    enrichImageMemory() — vision call on image upload (gated by state.enrichImages)
L3105    checkBackend() — hits /api/health, sets state flags
```

## Environment variables (full list)

| Var | Default | Effect |
|---|---|---|
| `XAI_API_KEY` | — | **Required** for backend mode |
| `XAI_MODEL` | `grok-4.3` | Chat model |
| `XAI_REALTIME_MODEL` | `grok-voice-latest` | Live voice model |
| `XAI_VOICE` | `ara` | Default TTS voice |
| `VM_API_TOKEN` | blank | Optional API auth header |
| `VM_ENRICH_IMAGES` | `0` | `1` = auto-describe images on upload (extra LLM call) |
| `VM_BROWSER_TTS` | `0` | `1` = use browser TTS, skip all xAI TTS calls |
| `VM_LIVE_RELOAD` | on | `0` = disable file watcher / auto-reload |
| `NODE_ENV` | — | `production` disables live reload |

## Current token-cost limits (after reduce-cloud-tokens PR)

| Setting | Value |
|---|---|
| `max_completion_tokens` | 350 |
| History turns sent | 6 |
| Memory items in prompt | 8 |
| Memory excerpt length | 600 chars |
| Tool-call rounds | 2 max |
| Reminders in context | 6 |
| Rate limit | 60 req/min/IP |

## How to start the server

```bash
cp .env.local.example .env.local  # add XAI_API_KEY
npm start                          # http://localhost:3000
npm run dev                        # same + file watching
```

## Common task patterns (read before editing)

**Adding a new tool**: add to `TOOL_SPECS` in `server.js` (L295), handle in `executeTool()` in `app.js` (L1434), add to `prettyTool()` (L1555).

**Changing the system prompt**: edit `buildSystemPrompt()` in `server.js` (L250). `MODE_GUIDES` and `PERSONA_TONES` are the two main dials.

**Changing UI pages**: pages are `home`, `talk`, `memory`, `settings`. Each has a section in `app.js` and corresponding markup in `index.html`. `showPage()` (L869) drives navigation.

**Adding an env flag**: add constant at top of `server.js` (L11 block), expose in `/api/health` response (L69 block), read in `checkBackend()` in `app.js` (L3105), store on `state{}` (L221).

## AI session rules (reduce token burn)

- **Do not read `styles.css` unless the task is purely visual.** It is 3,281 lines of CSS and almost never needs to be read in full.
- **Do not read `app.js` top-to-bottom.** Use line references above + `Grep` for specific functions.
- **Do not read `index.html` unless adding new DOM elements.**
- **Use `Grep` with a specific pattern before reaching for `Read`.** The line map above covers 90% of tasks.
- **Prefer targeted `StrReplace` edits over full-file rewrites.**
- **Check this file first every session** — it eliminates the exploration round entirely.
