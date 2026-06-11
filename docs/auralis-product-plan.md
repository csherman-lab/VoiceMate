# Auralis Product Plan

## Concept

Auralis is a human-like multimodal voice agent. It should feel like a mix of a natural phone assistant, ChatGPT-style text chat, a pitch coach, and a visible AI operator that shows what it is doing.

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

Use LiveKit for WebRTC/telephony orchestration and test model providers such as OpenAI Realtime or xAI Voice Agent API for the conversational engine.

### Real vision

Connect image uploads to a multimodal model so Auralis can identify objects, read screenshots, explain charts, and reason over visual evidence.

### Real memory

Add account-based private memory with controls for:

- public knowledge
- workspace knowledge
- private user memory
- temporary session-only memory
- source citations and deletion

### Real tools

Give Auralis permissioned actions:

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

**Auralis**

The name suggests audio, aura, intelligence, and a premium assistant feeling without tying the project to any specific company or repo.
