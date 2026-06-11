# VoiceMate Product Plan

## Concept

VoiceMate is a human-like multimodal voice agent. It should feel like a mix of a natural phone assistant, ChatGPT-style text chat, a pitch coach, and a visible AI operator that shows what it is doing.

## Core experience

- Apple/iOS-inspired interface
- Voice personality selection
- Natural voice output
- Push-to-talk voice input where the browser allows it
- Typed chat
- Upload text, markdown, JSON, CSV, logs, and images
- Local file summaries
- Visible activity feed
- Pitch mode
- Data analyst mode
- Meeting coach mode
- Natural conversation mode

## What the prototype can do locally

- Open directly in Chrome from `index.html`
- Speak responses out loud with browser speech synthesis
- Use Chrome speech recognition if available
- Read uploaded text-like files locally
- Summarize CSV rows, columns, and simple numeric ranges
- Preview uploaded images and read file dimensions
- Show an activity feed for each response
- Use session memory from uploaded files and pasted context

## What production should add

### Real realtime voice

Use Grok xAI Voice Agent API as the first production voice test because it supports realtime voice, tool use, and simple minute pricing. Do not put the Grok API key inside the static website. Put the key on a small backend, create voice sessions there, and let the browser connect to that backend.

Use LiveKit when VoiceMate needs WebRTC sessions, phone calls, call routing, recording, observability, and provider switching. LiveKit should be treated as the realtime infrastructure layer, while Grok or OpenAI should be treated as the voice intelligence layer.

### Real vision

Connect image uploads to a multimodal model so VoiceMate can identify objects, read screenshots, explain charts, and reason over visual evidence.

### Real memory

Add account-based private memory with controls for:

- public knowledge
- workspace knowledge
- private user memory
- temporary session-only memory
- source citations and deletion

### Real tools

Give VoiceMate permissioned actions:

- search company data
- query live databases
- create pitch decks
- write follow-up emails
- schedule meetings
- update CRM records
- produce call summaries
- create tasks

### Trust and visibility

Every serious answer should show:

- what sources were used
- what data was checked
- what assumptions were made
- what action it is about to take
- when a human should review the output

## Suggested product name

**VoiceMate**

The name is simple on purpose: it immediately communicates a friendly voice assistant without tying the project to any specific company or repo.
