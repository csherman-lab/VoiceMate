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

## Notes

- Text chat and uploads work directly from the file.
- Voice output works through Chrome's built-in speech synthesis.
- Microphone speech input depends on Chrome permissions and may require serving the page from `http://localhost` on some machines. If the mic does not work, type into the chat box.
- Uploaded files stay in the browser session; this prototype does not send them to a server.

## Production direction

To turn VoiceMate into a real production product, connect the UI to:

- a realtime voice stack such as LiveKit plus OpenAI or xAI;
- a multimodal model for real image understanding;
- persistent private memory;
- source-backed answers;
- web/data connectors;
- calendar, CRM, and workflow actions;
- account-level privacy controls.
