# VoiceMate

VoiceMate is a human-sounding voice companion. It talks back with **real Grok
voice**, runs a small catalog of **skills**, remembers what you upload during a
session, and shows a visible **reasoning trace** so you can watch it think.

The design is calm and Apple-inspired. The brains and the voice are Grok (xAI).
The structure — skills, automatic intent routing, a ReAct-style trace, and a
spoken daily briefing — is inspired by
[OpenJarvis](https://github.com/open-jarvis/OpenJarvis). See
[`docs/openjarvis-inspiration.md`](docs/openjarvis-inspiration.md) for exactly
what we studied and what we borrowed.

## What makes the voice good

- **Live Grok voice calls.** Tap **Start live call** in Talk to open a real-time
  speech-to-speech session over the xAI Realtime API (`grok-voice-latest`),
  with server-side voice activity detection, barge-in (interrupt it mid-sentence),
  and live transcription.
- **It talks like a human.** The system prompt makes Grok answer the way people
  actually *speak* — contractions, short sentences, natural reactions — and use
  Grok **speech tags** (`[pause]`, `[laugh]`, `[sigh]`, `<whisper>…</whisper>`)
  for genuine prosody instead of a flat robotic read.
- **Streaming typed turns.** When you type, replies stream into the transcript,
  can call tools, and are spoken with the Grok voice you picked.
- **Live captions that feel spoken.** In live calls, user transcription updates
  in place and VoiceMate's words reveal progressively so the transcript tracks
  the conversation instead of dumping blocks of text.
- **Graceful fallback.** With no backend, VoiceMate still runs in a local
  preview using the browser voice.

## What it can do

- **Acts, doesn't just talk.** VoiceMate has tools it can call by voice or text:
  remember a fact, search its memory, add or complete reminders, prepare email
  or text reminder drafts, switch its own voice, change skills, check time,
  calculate, get weather, and open links with confirmation.
- **Remembers between sessions.** Memory, reminders, voice, and skill are saved
  locally and restored on reload. Export or import your memory from Settings.
- **Understands uploads in conversation.** Uploaded files, notes, CSVs, photos,
  and screenshots become active context. Ask "what is this?" or keep talking in
  a live call and VoiceMate uses the latest upload instead of losing the thread.
- **Shows what it is using.** Talk has active context chips and a thinking/actions
  drawer so you can see uploads, tools, sources, and decisions without leaving
  the conversation.
- **Useful Home dashboard + onboarding.** Home now surfaces live voice status,
  active context, reminders, and recent conversations, while first-run onboarding
  helps users try Talk, uploads, and skills.
- **Understands images when connected.** Uploaded image metadata works locally;
  with the backend online, VoiceMate quietly asks the model for a better image
  description and saves that summary back to memory.
- **Safer local storage.** Large image previews are cached in IndexedDB when
  possible, with metadata kept in localStorage as a fallback.
- **Installable + offline.** It's a PWA — install it like a native app; the
  interface works offline.
- **Reactive voice orb, reminders, toasts, and keyboard shortcuts** (Esc ends a
  call, ⌘K / `/` jumps to the message box).

## Skills

Pick one on the Home screen, or just start talking and VoiceMate routes to the
right skill automatically:

- **Natural chat** — just talk.
- **Deep research** — looks things up with live search and cites sources.
- **Daily briefing** — a short spoken rundown from your saved memory.
- **Pitch builder** — turns rough ideas into a persuasive spoken pitch.
- **Data analyst** — summarizes uploaded CSVs and calls out patterns.
- **Meeting coach** — helps you sound clearer and more confident.

## Run it

### One file (local preview, no setup)

1. Open `open-voicemate.html` in Chrome (`Ctrl/Cmd+O`).
2. Type, upload files, and try the skills. Voice uses the browser engine here.

Real Grok voice can't run from a static file — a browser file is public, so a
key would leak. Use the backend below for the real thing.

### Backend (real Grok voice + live calls)

1. Add your key:

   ```bash
   cp .env.local.example .env.local
   # then edit .env.local
   ```

   ```bash
   XAI_API_KEY=your_real_grok_xai_key_here
   XAI_MODEL=grok-4.3
   XAI_REALTIME_MODEL=grok-voice-latest
   XAI_VOICE=ara
   ```

2. Start it (Node 18+, Node 22+ recommended):

   ```bash
   npm start
   ```

3. Open `http://localhost:3000`, go to **Talk**, and hit **Start live call**.

If you expose the server beyond localhost, set `VM_API_TOKEN` and put an auth
gate in front of the app. The local prototype has lightweight API rate limits,
but it is still designed primarily for local development.

### Develop with live reload (auto-deploy to localhost)

Run the dev server instead and the browser refreshes itself the moment you save
a file — no manual restart, no hard refresh:

```bash
npm run dev
```

- Editing `index.html`, `styles.css`, or `app.js` reloads the open tab instantly
  (the server watches them and pushes a reload over Server-Sent Events).
- Editing `server.js` restarts the server (`node --watch`) and the tab reloads
  on reconnect.
- Live reload is on by default in dev. Disable it with `VM_LIVE_RELOAD=0` or by
  setting `NODE_ENV=production`.

The browser talks to your local backend; the backend talks to Grok. Your API
key never reaches the browser. For live calls the backend mints a short-lived
ephemeral token so the browser can connect directly to xAI for low latency.

## Grok voices

`eve` (energetic) · `ara` (warm, default) · `rex` (confident) · `sal` (smooth)
· `leo` (grounded). Choose one in Settings.

## Design & voice

The look is **Apple / Settings.app**: filled colored rounded-square skill icons
with white glyphs, soft `26px` cards with hairline borders and layered shadows
(no heavy drop shadows), generous whitespace, chapter-style section headers, a
breathing voice orb, and full dark-mode support.

The voice is tuned to sound like a person, not a manual: punchy one-to-three
sentence replies, contractions, no spoken symbols (no bullet points, em-dashes,
markdown, or URLs read aloud), no corporate filler or sycophancy, and an honest
"I don't know" when it doesn't. These principles are baked into the system
prompt the backend sends to Grok.

## How it's built

- `index.html`, `styles.css`, `app.js` — the static front end (Apple-style UI,
  skills grid, Talk context chips, reasoning trace, live-call client, streaming
  chat, local tools, reminders, and upload memory).
- `server.js` — a dependency-free Node backend that proxies Grok chat
  (streaming SSE), Grok TTS, the realtime ephemeral token, and the voices list.
- `build-singlefile.js` — inlines the front end into `open-voicemate.html`
  (`npm run build`).
- `docs/` — product plan, interface inspiration, the OpenJarvis writeup, and [`docs/v0.4-release-and-roadmap.md`](docs/v0.4-release-and-roadmap.md).

## Changelog

### v0.4.0

Talk-first polish pass — see **What's new** on Home or **Settings → Release notes & Roadmap** in the app, and [`docs/v0.4-release-and-roadmap.md`](docs/v0.4-release-and-roadmap.md) for the full write-up.

**Shipped**

- Happy orb tap reaction (squint, 3D pop, glow; keyboard accessible).
- 3D orb gaze, darker glass style, live caption polish with active-word highlight.
- Home dashboard, first-run onboarding, context bottom sheet.
- Backend image understanding hook, AudioWorklet mic capture.
- Live transcript fixes, system/call status chips, cleaner Talk & Settings UI.

**Next (roadmap)**

- Orb emotional states and micro-moments.
- FaceTime-style call states and timer.
- Skill-specific workflow screens.
- PDF/OCR/DOCX extraction, memory categories, reminder parsing.
- E2E tests, IndexedDB uploads, deploy hardening.

## Notes & security

- Never put a real key in `open-voicemate.html` or any client file.
- Microphone access for live calls needs a secure context — `http://localhost`
  works; for remote hosting use HTTPS.
- Uploaded files stay in the browser; this prototype does not persist them to a
  server. Reminder emails/texts open as drafts on your device unless you add a
  real delivery provider later.
