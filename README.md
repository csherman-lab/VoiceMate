# VoiceMate Voice Agent

VoiceMate is an Apple-inspired prototype for a human-like multimodal voice agent. It can talk out loud, accept typed chat, remember information you upload during the session, summarize CSV/text files, inspect uploaded image metadata, help pitch ideas, and show a visible activity feed so the user can see what it is doing.

## What the original available repo did

The requested `https://github.com/deftai/evobot` repository was not accessible from this environment. GitHub returned "repository not found" for that URL.

The repository that was actually checked out here originally contained only a placeholder README with `# k`, so there was no app logic to analyze. This branch turns that empty repo into the VoiceMate prototype.

## What is included

- A one-file version you can download and open: `open-voicemate.html`
- A polished static web app (`index.html`, `styles.css`, `app.js`)
- Voice personality selection
- Browser speech synthesis
- Push-to-talk speech recognition where Chrome allows it
- Typed chat
- Uploads for text, markdown, JSON, CSV, logs, and images
- Local summaries for uploaded files
- A visible "what VoiceMate is doing" activity feed
- Pitch mode, analyst mode, meeting coach mode, and natural conversation mode
- Apple/iOS-style visual design

## Open it on your regular computer

The simplest way:

1. Download `open-voicemate.html`.
2. Open Google Chrome.
3. Press `Ctrl+O` on Windows/Linux or `Cmd+O` on Mac.
4. Choose `open-voicemate.html`.

That is the easiest version because it is just one file.

The developer version:

1. Download or copy this project folder to your computer.
2. Keep these files together in the same folder:
   - `index.html`
   - `styles.css`
   - `app.js`
3. Open `index.html` in Chrome.

You do **not** need `localhost`, a terminal, a server, npm, or Python.

## Run it with your Grok xAI key

Use this version when you want VoiceMate to call Grok safely through the backend.

1. Put your key in `.env.local`:

```bash
XAI_API_KEY=your_real_grok_xai_key_here
XAI_MODEL=grok-4.3
```

2. Start the backend:

```bash
npm start
```

or:

```bash
node server.js
```

3. Open this in Chrome:

```txt
http://localhost:3000
```

Now the browser talks to your local backend, and the backend talks to Grok. The key stays in `.env.local` and is not exposed to the browser.

## Notes

- Text chat and uploads work directly from the file.
- Voice output works through Chrome's built-in speech synthesis.
- Microphone speech input depends on Chrome permissions and may require serving the page from `http://localhost` on some machines. If the mic does not work, type into the chat box.
- Uploaded files stay in the browser session; this prototype does not send them to a server.

## Production direction

To turn VoiceMate into a real production product, connect the UI to:

- Grok xAI Voice Agent API for the first high quality voice test;
- a small backend that stores the Grok API key safely;
- LiveKit when you need WebRTC sessions, phone calls, observability, and provider switching;
- a multimodal model for real image understanding;
- persistent private memory;
- source-backed answers;
- web/data connectors;
- calendar, CRM, and workflow actions;
- account-level privacy controls.

Do not ship a real Grok API key inside `open-voicemate.html`. A browser file can be inspected by anyone who has it. Use a backend for real keys.

## Where to put your Grok xAI key

Put the real key in a local file named `.env.local`.

Start by copying the template:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and paste the key here:

```bash
XAI_API_KEY=your_real_grok_xai_key_here
XAI_MODEL=grok-4.3
```

`.env.local` is ignored by git, so it should not be pushed to GitHub. The one file browser demo still cannot safely call Grok directly. Use `npm start` or `node server.js` for the Grok connected version.
