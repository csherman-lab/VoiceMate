# Deft.ai Voice Agent Prototype

An Apple/iOS-inspired browser prototype for a Deft.ai voice agent. The agent is designed to explain Deft Robotics, answer client questions, route prospects toward the right next step, and compare production voice AI provider options.

## What is included

- A polished static web app (`index.html`, `styles.css`, `app.js`)
- Voice persona selection with browser speech synthesis
- Push-to-talk demo using the browser Web Speech API where supported
- A Deft.ai public knowledge base (`data/deft-knowledge.json`)
- A provider recommendation memo (`docs/voice-ai-recommendation.md`)

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

Chrome-based browsers have the best support for speech recognition. If speech recognition is unavailable, type into the prompt box and press send.

## Production recommendation

Start with the architecture in `docs/voice-ai-recommendation.md`:

1. **Fastest low-cost voice MVP:** xAI Voice Agent API.
2. **Best quality/capability default:** OpenAI GPT-Realtime mini.
3. **Best scalable production architecture:** LiveKit Agents as the orchestration layer with swappable providers.

The current prototype is intentionally provider-neutral so Deft can swap in xAI, OpenAI, LiveKit, or another realtime stack without redesigning the client experience.
