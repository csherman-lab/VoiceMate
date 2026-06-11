# Deft.ai Voice AI Recommendation

## Goal

Build a human-like voice agent that understands Deft.ai, explains why Deft's robotics deployment model matters, routes prospects toward the right next step, and can eventually operate across web, phone, and internal workflows.

## Recommendation

Use a provider-neutral architecture:

1. **Prototype and cost test:** xAI Voice Agent API.
2. **Quality default:** OpenAI GPT-Realtime mini.
3. **Production orchestration:** LiveKit Agents, with xAI/OpenAI/ElevenLabs/other providers plugged in based on measured latency, quality, and cost.

This keeps the agent from being locked into a single vendor before Deft has call transcripts, conversion metrics, and volume assumptions.

## Provider comparison

| Option | Current pricing signal | Strengths | Risks / watchouts | Best fit |
| --- | --- | --- | --- | --- |
| xAI Voice Agent API | $0.05 per realtime audio minute plus $0.004 per text input event | Simple transparent realtime pricing, integrated speech-to-speech, function calling, web/X search options | Newer voice ecosystem; validate latency, voice quality, compliance, observability, and region fit | Lowest-cost MVP and cost benchmark |
| OpenAI GPT-Realtime mini | Text: $0.60 input / $2.40 output per 1M tokens; audio pricing commonly listed around $10 input / $20 output per 1M tokens | Mature API ecosystem, WebRTC/WebSocket/SIP support, good realtime model quality, function calling | Prompt-heavy sessions can become expensive; careful retrieval and caching matter | Best default for high-quality web voice agent |
| LiveKit Agents | $0.01 per agent session minute for LiveKit Cloud agent hosting, plus STT/LLM/TTS/telephony costs | Orchestration, WebRTC, SIP/telephony, observability, scaling, rollbacks, provider freedom | Not a model by itself; requires selecting STT, LLM, TTS, and deployment patterns | Scalable production layer |
| ElevenLabs Conversational AI | Often around $0.08-$0.10 per minute plus LLM costs depending on plan | Excellent voice quality, fast managed setup, strong voice brand | LLM pass-through costs and less low-level control than a custom LiveKit stack | Polished demos or premium voice experience |

## Architecture path

### Phase 1: Web demo

- Use the included browser prototype.
- Keep company knowledge in `data/deft-knowledge.json`.
- Let visitors choose from a few voice personalities.
- Capture common questions manually from demos.

### Phase 2: Production web agent

- Use LiveKit for WebRTC session transport and observability.
- Test xAI Voice Agent API vs OpenAI GPT-Realtime mini with the same Deft system prompt and knowledge retrieval.
- Keep prompts short. Retrieve only relevant Deft facts for each turn instead of injecting the full company knowledge base into every session.
- Add tools for:
  - booking a call,
  - collecting task video metadata,
  - routing to sales/engineering,
  - logging unanswered questions for knowledge-base improvement.

### Phase 3: Phone and enterprise workflows

- Use LiveKit SIP/telephony if Deft wants inbound or outbound phone calls.
- Add consent and call recording policies.
- Add CRM updates, lead qualification, calendar scheduling, and safe handoff to a Deft human.
- Build evaluation sets from real transcripts: ROI questions, safety questions, technical objections, and procurement questions.

## Suggested Deft system behavior

The agent should:

- sound warm, concise, and confident;
- explain that Deft automates the factory work that still needs humans;
- focus on manufacturing outcomes: throughput, labor stability, consistency, downtime reduction, and practical ROI;
- avoid inventing specs, private customer details, or guarantees;
- route qualified prospects to a discovery call and ask for task videos;
- route technical unknowns to a Deft engineer.

## Knowledge strategy

Public website facts are enough for a demo, but a production assistant should use a retrieval pipeline containing:

- website copy,
- case studies,
- FAQs,
- sales enablement notes,
- safety/compliance docs,
- approved objection handling,
- ROI calculator assumptions,
- deployment and support playbooks.

For privacy and trust, separate public prospect-facing knowledge from internal-only knowledge and mark every source with visibility rules.

## Cost-control checklist

- Use short persona prompts.
- Retrieve only the top few relevant knowledge snippets per turn.
- Cache recurring instructions and company summaries where the provider supports caching.
- Track cost per qualified lead, not just cost per minute.
- Keep fallback text chat available when the browser or caller environment does not support realtime voice.
- Run the same evaluation calls through xAI, OpenAI, and a LiveKit-composed stack before committing.
