# What OpenJarvis did, and what we borrowed

We studied [open-jarvis/OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
(Stanford Scaling Intelligence Lab / Hazy Research) to decide which ideas were
worth pulling into VoiceMate — while keeping our own calm, Apple-style design.

## What OpenJarvis is

OpenJarvis is a **local-first personal AI framework** written in Python. Its
thesis: most personal AI still routes everything through cloud APIs, but local
models are now good enough to handle the majority of everyday queries, so the
missing piece is the *software stack*. OpenJarvis is that stack.

How they built it (the parts that mattered to us):

- **A skills catalog.** Every capability is a "skill" — a tool the agent can
  discover from a catalog and invoke on demand. Skills can be imported from
  public sources and optimized from the user's own trace history.
- **Built-in agents across execution modes.** On-demand, scheduled, and
  continuous agents: `morning_digest`, `deep_research`, `orchestrator`,
  `native_react` (a ReAct Thought→Action→Observation loop), `operative`,
  `native_openhands` (CodeAct), and a plain `simple` chat agent.
- **An orchestrator that auto-routes.** `QueryOrchestrator` inspects the query,
  detects intent (e.g. "good morning" → morning digest), and routes to the
  right agent automatically, injecting relevant memory as context.
- **A spoken Morning Digest.** It collects from email/calendar/health/news,
  has the LLM synthesize a 2–4 minute briefing in *decreasing order of
  importance*, and renders it to audio with a TTS backend.
- **Deep research with citations**, memory with compression/retrieval, and a
  strong "show your work" / transparency ethos throughout.
- **Pluggable speech backends** (Cartesia, OpenAI, Kokoro, Deepgram, Whisper)
  behind a single `TTSBackend` interface.

## What we kept the same (our design + theme)

- The Apple/iOS visual language: glass surfaces, the gradient voice orb, the
  rounded pill nav, ambient blurs, light theme, calm copy.
- A single static front end plus a tiny Node backend — no heavy framework.
- The Home / Talk / Memory / Settings layout.

## What we borrowed, reimagined in our style

| OpenJarvis idea | How it shows up in VoiceMate |
|---|---|
| Skills catalog | A **Skills grid** on Home. Each skill maps to a conversation mode. |
| Orchestrator intent routing | **Auto-routing**: what you say switches VoiceMate to the right skill (`detectSkill`). |
| ReAct loop (Thought→Action→Observation) | The activity feed is now a **reasoning trace** with color-coded Thinking / Doing / Noticed steps. |
| Morning Digest | A **Daily briefing** skill that produces a short spoken rundown from your saved memory, in decreasing order of importance. |
| Deep research + citations | A **Deep research** skill that uses Grok live search and renders source chips under the reply. |
| Spoken, human delivery | A genuinely human voice (see below). |

## What we did NOT copy

- The full Python framework, the energy/FLOPs evaluation harness, the learning
  loop, Ollama/local-model stack, desktop app, and connectors. VoiceMate stays
  a lightweight web companion focused on a great voice experience.

## The voice upgrade (the priority)

The previous build leaned on the browser's robotic `speechSynthesis` and a flat
system prompt. Now:

- **Real Grok voice.** Live speech-to-speech calls over the xAI Realtime API
  (`grok-voice-latest`) with server-side VAD, barge-in, and live transcription;
  plus Grok TTS (`/v1/tts`) for spoken replies, proxied safely through the
  backend.
- **It talks like a person.** A rewritten system prompt makes Grok reply the
  way people actually *speak* — contractions, short sentences, natural
  reactions, the occasional follow-up question — and use Grok **speech tags**
  (`[pause]`, `[laugh]`, `[sigh]`, `<whisper>…</whisper>`) for real prosody.
- **Streaming replies** so it feels alive, and a humanizer that strips
  markdown/URLs so nothing robotic ever gets read aloud.
