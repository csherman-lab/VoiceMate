// VoiceMate — a human-sounding voice companion.
// Local-first inspiration from OpenJarvis: a skills catalog, automatic intent
// routing, and a visible "show its work" reasoning trace — all wrapped in our
// own calm, Apple-style design.

const STARTER_MEMORY = [
  {
    type: "brief",
    name: "VoiceMate product brief",
    summary:
      "VoiceMate is a human sounding voice companion. It talks with a natural voice, runs skills, remembers your uploads, and shows its reasoning.",
    content:
      "VoiceMate should feel like a calm, capable teammate: natural realtime voice, a skills catalog, session memory, and a visible reasoning trace.",
    createdAt: new Date().toISOString()
  }
];

const GROK_VOICES = [
  {
    id: "ara",
    name: "Ara",
    style: "Warm, friendly",
    bestFor: "The most natural, human conversation",
    rate: 1.0,
    pitch: 1.0
  },
  {
    id: "eve",
    name: "Eve",
    style: "Energetic, upbeat",
    bestFor: "Bright, lively demos and friendly chats",
    rate: 1.04,
    pitch: 1.05
  },
  {
    id: "rex",
    name: "Rex",
    style: "Confident, clear",
    bestFor: "Business walkthroughs and pitches",
    rate: 0.98,
    pitch: 0.96
  },
  {
    id: "sal",
    name: "Sal",
    style: "Smooth, balanced",
    bestFor: "Versatile, even delivery",
    rate: 1.0,
    pitch: 1.0
  },
  {
    id: "leo",
    name: "Leo",
    style: "Grounded, reassuring",
    bestFor: "Calm coaching and clear instructions",
    rate: 0.95,
    pitch: 0.92
  }
];

// OpenJarvis-style skills catalog. Each skill maps to a conversation mode and
// can be auto-detected from what the user says (intent routing).
const SKILLS = [
  {
    id: "companion",
    name: "Natural chat",
    tag: "Talk",
    color: "#007aff",
    blurb: "Just talk. VoiceMate listens and replies like a real person.",
    keywords: []
  },
  {
    id: "research",
    name: "Deep research",
    tag: "Research",
    color: "#5e5ce6",
    blurb: "Looks things up and gives a clear, sourced answer with citations.",
    keywords: [
      "research",
      "look up",
      "find out",
      "search for",
      "sources",
      "cite",
      "latest",
      "news on",
      "who is",
      "what happened"
    ]
  },
  {
    id: "digest",
    name: "Daily briefing",
    tag: "Briefing",
    color: "#ff9f0a",
    blurb: "A short spoken briefing from your saved notes and files.",
    keywords: ["briefing", "digest", "catch me up", "good morning", "what's on", "rundown"]
  },
  {
    id: "pitch",
    name: "Pitch builder",
    tag: "Pitch",
    color: "#ff2d55",
    blurb: "Turns rough ideas into a sharp, persuasive spoken pitch.",
    keywords: ["pitch", "sell", "client", "investor", "persuade", "demo this"]
  },
  {
    id: "analyst",
    name: "Data analyst",
    tag: "Data",
    color: "#34c759",
    blurb: "Summarizes your CSVs and calls out the patterns that matter.",
    keywords: ["data", "csv", "numbers", "trend", "analyze", "spreadsheet", "average", "stats"]
  },
  {
    id: "coach",
    name: "Meeting coach",
    tag: "Coach",
    color: "#30b0c7",
    blurb: "Coaches you to sound clearer, calmer, and more confident.",
    keywords: ["coach", "practice", "feedback", "interview", "present", "rehearse"]
  }
];

const SUGGESTED_PROMPTS = [
  "Let's just chat",
  "Summarize what I uploaded",
  "Remind me to follow up"
];

const REALTIME_SAMPLE_RATES = [8000, 16000, 22050, 24000, 32000, 44100, 48000];

const TOOL_DEFS = [
  {
    name: "remember_fact",
    description: "Save an important fact, preference, or note to memory for later.",
    parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
  },
  {
    name: "search_memory",
    description: "Search saved memory for relevant information.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
  },
  {
    name: "add_reminder",
    description: "Add a reminder or task for the user.",
    parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] }
  },
  {
    name: "list_reminders",
    description: "List the user's current reminders.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "complete_reminder",
    description: "Mark a reminder done by its text or number.",
    parameters: { type: "object", properties: { which: { type: "string" } }, required: ["which"] }
  },
  {
    name: "set_voice",
    description: "Change VoiceMate's speaking voice.",
    parameters: {
      type: "object",
      properties: { voice: { type: "string", enum: ["eve", "ara", "rex", "sal", "leo"] } },
      required: ["voice"]
    }
  },
  {
    name: "set_skill",
    description: "Switch the active skill / conversation mode.",
    parameters: {
      type: "object",
      properties: {
        skill: { type: "string", enum: ["companion", "research", "digest", "pitch", "analyst", "coach"] }
      },
      required: ["skill"]
    }
  }
];

const REALTIME_TOOLS = TOOL_DEFS.map((tool) => ({ type: "function", ...tool }));

const STORE_KEY = "voicemate.state.v1";

const state = {
  memory: [...STARTER_MEMORY],
  reminders: [],
  persona: "ara",
  mode: "companion",
  recognition: null,
  recognizing: false,
  backendOnline: false,
  backendModel: "",
  realtimeModel: "",
  talkStarted: false,
  history: [],
  currentAudioUrl: "",
  currentAudio: null,
  streaming: false,
  live: null
};

const els = {};

function cacheEls() {
  Object.assign(els, {
    navLinks: document.querySelectorAll(".nav-link"),
    pageLinks: document.querySelectorAll(".page-link"),
    promptLinks: document.querySelectorAll(".prompt-link"),
    skillLinks: document.querySelectorAll("[data-skill]"),
    pages: document.querySelectorAll("[data-page-panel]"),
    brandLogo: document.querySelector("#brandLogo"),
    talkLogo: document.querySelector("#talkLogo"),
    skillGrid: document.querySelector("#skillGrid"),
    personaList: document.querySelector("#personaList"),
    agentMode: document.querySelector("#agentMode"),
    sampleVoice: document.querySelector("#sampleVoice"),
    activePersonaName: document.querySelector("#activePersonaName"),
    modeCaption: document.querySelector("#modeCaption"),
    speechStatus: document.querySelector("#speechStatus"),
    voiceHint: document.querySelector("#voiceHint"),
    transcript: document.querySelector("#transcript"),
    promptForm: document.querySelector("#promptForm"),
    promptInput: document.querySelector("#promptInput"),
    micButton: document.querySelector("#micButton"),
    liveButton: document.querySelector("#liveButton"),
    callIcon: document.querySelector("#callIcon"),
    voiceOrb: document.querySelector("#voiceOrb"),
    heroOrb: document.querySelector("#heroOrb"),
    quickPrompts: document.querySelector("#quickPrompts"),
    activityFeed: document.querySelector("#activityFeed"),
    knowledgeUpload: document.querySelector("#knowledgeUpload"),
    imageUpload: document.querySelector("#imageUpload"),
    quickFileUpload: document.querySelector("#quickFileUpload"),
    pasteToggle: document.querySelector("#pasteToggle"),
    pastePanel: document.querySelector("#pastePanel"),
    manualContext: document.querySelector("#manualContext"),
    saveContext: document.querySelector("#saveContext"),
    clearMemory: document.querySelector("#clearMemory"),
    clearTranscript: document.querySelector("#clearTranscript"),
    copyTranscript: document.querySelector("#copyTranscript"),
    saveTranscript: document.querySelector("#saveTranscript"),
    memoryGrid: document.querySelector("#memoryGrid"),
    grokStatus: document.querySelector("#grokStatus"),
    backendStatus: document.querySelector("#backendStatus"),
    testConnection: document.querySelector("#testConnection"),
    themeSeg: document.querySelector("#themeSeg"),
    reminderList: document.querySelector("#reminderList"),
    reminderInput: document.querySelector("#reminderInput"),
    addReminder: document.querySelector("#addReminder"),
    exportData: document.querySelector("#exportData"),
    importData: document.querySelector("#importData")
  });
}

function init() {
  cacheEls();
  loadState();
  applyStoredTheme();
  if (els.brandLogo) els.brandLogo.innerHTML = logoSvg("vmlogo1");
  if (els.talkLogo) els.talkLogo.innerHTML = logoSvg("vmlogo2");
  renderIcons();
  renderSkills();
  renderPersonas();
  renderQuickPrompts();
  renderMemory();
  renderReminders();
  if (els.agentMode) els.agentMode.value = state.mode;
  updateModeCaption();
  updateGrokStatus();
  setLiveButton(false, "Start call");
  setupSpeechRecognition();
  setupShortcuts();
  setupEyes();
  registerServiceWorker();
  wireEvents();

  addActivity("Started session", "Voice, skills, files, and memory are ready.");

  const pageFromHash = window.location.hash.replace("#", "");
  const initialPage = pageFromHash === "setup" ? "settings" : pageFromHash;
  checkBackend().finally(() => {
    if (["home", "talk", "memory", "settings"].includes(initialPage)) {
      showPage(initialPage);
    }
    window.requestAnimationFrame(() => document.body.classList.add("ui-ready"));
  });
}

function wireEvents() {
  els.navLinks.forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  els.pageLinks.forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  els.promptLinks.forEach((button) => {
    button.addEventListener("click", () =>
      handlePrompt(button.dataset.prompt || button.textContent)
    );
  });

  els.promptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handlePrompt(els.promptInput.value);
  });

  els.micButton.addEventListener("click", () => {
    if (!state.recognition) {
      addMessage(
        "agent",
        "Voice input isn't available in this browser session. You can still type, or tap Start call for the live voice."
      );
      addActivity("Voice input unavailable", "This browser did not provide speech input.");
      return;
    }
    if (state.recognizing) {
      state.recognition.stop();
    } else {
      state.recognition.start();
    }
  });

  if (els.liveButton) {
    els.liveButton.addEventListener("click", () => {
      if (state.live) {
        endLiveCall("You ended the call.");
      } else {
        startLiveCall();
      }
    });
  }

  els.agentMode.addEventListener("change", (event) => {
    setMode(event.target.value, true);
  });

  els.sampleVoice.addEventListener("click", () => {
    const persona = getPersona();
    speak(`Hey, I'm ${persona.name}. [pause] Ask me anything, or hand me a file and I'll dig in.`);
  });

  els.knowledgeUpload.addEventListener("change", (event) => {
    handleKnowledgeFiles([...event.target.files]);
    event.target.value = "";
  });

  els.imageUpload.addEventListener("change", (event) => {
    handleImageFiles([...event.target.files]);
    event.target.value = "";
  });

  els.quickFileUpload.addEventListener("change", (event) => {
    const files = [...event.target.files];
    routeFiles(files);
    event.target.value = "";
  });

  if (els.pasteToggle) {
    els.pasteToggle.addEventListener("click", () => {
      const hidden = els.pastePanel.hasAttribute("hidden");
      els.pastePanel.toggleAttribute("hidden", !hidden);
      if (hidden) els.manualContext.focus();
    });
  }

  if (els.themeSeg) {
    els.themeSeg.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => setTheme(button.dataset.theme));
    });
  }

  if (els.addReminder) {
    els.addReminder.addEventListener("click", () => {
      const text = (els.reminderInput.value || "").trim();
      if (!text) return;
      executeTool("add_reminder", { text });
      els.reminderInput.value = "";
    });
    els.reminderInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        els.addReminder.click();
      }
    });
  }

  if (els.exportData) els.exportData.addEventListener("click", exportData);
  if (els.importData) {
    els.importData.addEventListener("change", (event) => {
      importData(event.target.files[0]);
      event.target.value = "";
    });
  }

  els.saveContext.addEventListener("click", saveManualContext);

  els.clearMemory.addEventListener("click", () => {
    state.memory = [];
    renderMemory();
    addActivity("Cleared memory", "Session memory is empty.");
    addMessage("agent", "Done, I cleared everything I was remembering for this session.");
  });

  els.clearTranscript.addEventListener("click", () => {
    els.transcript.innerHTML = "";
    state.history = [];
    state.talkStarted = false;
    addActivity("Started new chat", "Transcript cleared.");
    if (document.body.classList.contains("talk-session")) {
      startTalkSession();
    }
  });

  els.copyTranscript.addEventListener("click", async () => {
    const text = getTranscriptText();
    if (!text) {
      addActivity("Nothing to copy", "The chat is empty.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      addActivity("Copied chat", "Transcript copied to clipboard.");
    } catch (error) {
      addActivity("Copy unavailable", "Browser clipboard access was blocked.");
    }
  });

  els.saveTranscript.addEventListener("click", () => {
    const text = getTranscriptText();
    if (!text) {
      addActivity("Nothing to save", "The chat is empty.");
      return;
    }
    state.memory.push({
      type: "note",
      name: `Saved chat ${state.memory.length + 1}`,
      summary: summarizeText(text),
      content: text,
      createdAt: new Date().toISOString()
    });
    renderMemory();
    addActivity("Saved chat", "Transcript added to memory.");
  });

  els.testConnection.addEventListener("click", async () => {
    addActivity("Testing connection", "Checking the voice connection.");
    await checkBackend();
    addActivity(
      state.backendOnline ? "Voice engine connected" : "Voice engine offline",
      els.grokStatus.textContent
    );
  });

  document.addEventListener("dragover", (event) => event.preventDefault());
  document.addEventListener("drop", (event) => {
    event.preventDefault();
    routeFiles([...event.dataTransfer.files]);
    showPage("memory");
  });
}

function routeFiles(files) {
  const images = files.filter((file) => file.type.startsWith("image/"));
  const docs = files.filter((file) => !file.type.startsWith("image/"));
  if (docs.length) handleKnowledgeFiles(docs);
  if (images.length) handleImageFiles(images);
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function showPage(page) {
  const update = () => {
    document.body.classList.toggle("talk-session", page === "talk");
    els.pages.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.pagePanel === page);
    });
    els.navLinks.forEach((button) => {
      button.classList.toggle("active", button.dataset.page === page);
    });
  };

  if (document.startViewTransition && document.body.classList.contains("ui-ready")) {
    document.startViewTransition(update);
  } else {
    update();
  }

  if (page === "talk") {
    startTalkSession();
  } else {
    endTalkSession();
  }

  addActivity("Opened page", `${titleCase(page)} is active.`);
  if (window.location.hash.replace("#", "") !== page) {
    window.history.replaceState(null, "", `#${page}`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startTalkSession() {
  if (state.talkStarted) return;
  state.talkStarted = true;
  const persona = getPersona();
  const greeting = state.backendOnline
    ? `Hey, I'm ${persona.name}. [pause] What's on your mind?`
    : `Hey, I'm ${persona.name}. What's on your mind?`;

  addActivity("Started talk session", `${persona.name} voice is active.`);
  addMessage("agent", stripSpeechTags(greeting));
  state.history.push({ role: "assistant", content: stripSpeechTags(greeting) });
  speak(greeting);
}

function endTalkSession() {
  if (state.live) endLiveCall("Call ended.");
  if (!state.talkStarted) return;
  state.talkStarted = false;
  if (state.recognition && state.recognizing) state.recognition.stop();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  stopCurrentAudio();
  setSpeechStatus("Ready", false, false);
}

function stopCurrentAudio() {
  if (state.currentAudio) {
    state.currentAudio.pause();
    state.currentAudio = null;
  }
  if (state.currentAudioUrl) {
    URL.revokeObjectURL(state.currentAudioUrl);
    state.currentAudioUrl = "";
  }
  stopTtsReaction();
}

// ---------------------------------------------------------------------------
// Skills + personas + modes
// ---------------------------------------------------------------------------

function renderSkills() {
  if (!els.skillGrid) return;
  els.skillGrid.innerHTML = "";
  SKILLS.forEach((skill) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "skill-card";
    card.dataset.skill = skill.id;
    const tint = skill.color || "#007aff";
    card.innerHTML = `
      <span class="skill-icon" style="--tint:${tint}">${svgIcon(skillIcon(skill.id))}</span>
      <span class="skill-tag" style="color:${tint};background:${hexToSoft(tint)}">${escapeHtml(skill.tag)}</span>
      <strong>${escapeHtml(skill.name)}</strong>
      <p>${escapeHtml(skill.blurb)}</p>
    `;
    card.addEventListener("click", () => {
      setMode(skill.id, false);
      showPage("talk");
      addActivity("Skill selected", `${skill.name} is ready.`);
    });
    els.skillGrid.appendChild(card);
  });
}

function skillIcon(id) {
  const map = {
    companion: "chat",
    research: "search",
    digest: "sun",
    pitch: "bolt",
    analyst: "chart",
    coach: "target"
  };
  return map[id] || "sparkles";
}

function renderPersonas() {
  els.personaList.innerHTML = "";
  GROK_VOICES.forEach((persona) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `persona-option${persona.id === state.persona ? " active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(persona.id === state.persona));
    button.innerHTML = `<div class="p-text"><strong>${persona.name}</strong><span>${persona.style} · ${persona.bestFor}</span></div>`;
    button.addEventListener("click", () => selectPersona(persona.id, true));
    els.personaList.appendChild(button);
  });
  updatePersonaLabel();
}

function selectPersona(personaId, preview) {
  const persona = GROK_VOICES.find((item) => item.id === personaId);
  if (!persona) return;
  state.persona = persona.id;
  saveState();
  renderPersonas();
  updatePersonaLabel();
  addActivity("Changed voice", `${persona.name} is selected.`);
  if (state.live) {
    addMessage("agent", "Pick the voice before starting a live call so I switch cleanly.");
  } else if (preview) {
    speak(`I'm ${persona.name}. Ready when you are.`);
  }
}

function updatePersonaLabel() {
  els.activePersonaName.textContent = getPersona().name;
}

function setMode(modeId, fromSelect) {
  const skill = SKILLS.find((item) => item.id === modeId);
  if (!skill) return;
  state.mode = skill.id;
  saveState();
  if (els.agentMode && !fromSelect) els.agentMode.value = skill.id;
  updateModeCaption();
  addActivity("Mode set", `${skill.name} mode is active.`);
}

function updateModeCaption() {
  els.modeCaption.textContent = modeLabel();
}

function renderQuickPrompts() {
  els.quickPrompts.innerHTML = "";
  SUGGESTED_PROMPTS.forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => handlePrompt(prompt));
    els.quickPrompts.appendChild(button);
  });
}

// ---------------------------------------------------------------------------
// Intent routing (OpenJarvis-style)
// ---------------------------------------------------------------------------

function detectSkill(text) {
  const lower = text.toLowerCase();
  for (const skill of SKILLS) {
    if (skill.keywords.some((keyword) => lower.includes(keyword))) {
      return skill;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reasoning trace (ReAct: thought -> action -> observation)
// ---------------------------------------------------------------------------

function planReasoning(prompt, detected) {
  const steps = [];
  const skill = detected || SKILLS.find((item) => item.id === state.mode) || SKILLS[0];

  steps.push({
    type: "thought",
    text: `Sounds like a ${skill.name.toLowerCase()} request. I'll handle it as ${getPersona().name}.`
  });

  if (state.memory.length) {
    steps.push({
      type: "action",
      text: `Checking session memory (${state.memory.length} item${state.memory.length === 1 ? "" : "s"}).`
    });
    const relevant = relevantMemory(prompt);
    steps.push({
      type: "observation",
      text: relevant ? `Found something useful: ${relevant}.` : "Nothing directly relevant in memory."
    });
  }

  if (skill.id === "analyst") {
    const csvs = state.memory.filter((item) => item.type === "csv");
    steps.push({
      type: "observation",
      text: csvs.length ? `${csvs.length} CSV file(s) ready to read.` : "No CSV uploaded yet."
    });
  }

  if (skill.id === "research") {
    steps.push({ type: "action", text: "Researching with live search before answering." });
  }

  steps.push({
    type: "action",
    text: state.backendOnline ? "Thinking it through." : "Composing a local answer."
  });

  return steps;
}

function relevantMemory(prompt) {
  const lower = prompt.toLowerCase();
  const words = new Set(lower.match(/[a-z0-9]{4,}/g) || []);
  for (const item of state.memory.slice().reverse()) {
    const hay = `${item.name} ${item.summary}`.toLowerCase();
    for (const word of words) {
      if (hay.includes(word)) return item.name;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Prompt handling + streaming chat
// ---------------------------------------------------------------------------

async function handlePrompt(prompt) {
  const cleaned = String(prompt || "").trim();
  if (!cleaned) return;
  if (state.streaming) return;

  showPage("talk");
  addMessage("user", cleaned);
  state.history.push({ role: "user", content: cleaned });
  els.promptInput.value = "";

  const detected = detectSkill(cleaned);
  if (detected && detected.id !== state.mode) {
    setMode(detected.id, false);
    addActivity("Auto-routed", `Switched to ${detected.name} based on what you asked.`);
  }

  const steps = planReasoning(cleaned, detected);
  steps.forEach((step, index) => {
    window.setTimeout(() => addReasoning(step.type, step.text), index * 140);
  });

  const startDelay = Math.max(280, steps.length * 150);
  window.setTimeout(() => respond(cleaned), startDelay);
}

async function respond(prompt) {
  state.streaming = true;
  setSpeechStatus("Thinking", false, false);
  const bubble = addMessage("agent", "");
  bubble.classList.add("typing");

  let answer = "";
  let citations = [];

  if (state.backendOnline) {
    try {
      const result = await chatAgent(prompt, collectImagesForPrompt(prompt));
      answer = result.text || answer;
      citations = result.citations || [];
      addReasoning("observation", "Got a reply. Speaking it now.");
    } catch (error) {
      addReasoning("observation", `Voice service hiccup (${error.message || "error"}). Using a local reply.`);
      answer = answerPrompt(prompt);
    }
  } else {
    answer = answerPrompt(prompt);
    addReasoning("observation", "Answered locally (no backend connected).");
  }

  const spoken = answer || answerPrompt(prompt);
  bubble.classList.remove("typing");
  bubble.textContent = stripSpeechTags(spoken);
  if (citations.length) renderCitations(bubble, citations);
  state.history.push({ role: "assistant", content: stripSpeechTags(spoken) });

  state.streaming = false;
  speak(spoken);
}

// Tool-enabled chat: calls the backend, runs any tools VoiceMate requests
// (remember, reminders, set voice/skill, etc.), then returns the final reply.
async function chatAgent(prompt, images) {
  const baseBody = {
    message: prompt,
    persona: getPersona().id,
    mode: state.mode,
    history: state.history.slice(0, -1).slice(-10),
    memory: state.memory.map(memoryForContext)
  };

  let toolMessages = [];
  let citations = [];

  for (let round = 0; round < 4; round++) {
    const response = await fetch("/api/grok/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...baseBody,
        images: round === 0 ? images || [] : [],
        toolMessages
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Voice request failed");
    if (data.citations && data.citations.length) citations = data.citations;

    const calls = data.toolCalls || [];
    if (!calls.length) {
      return { text: data.answer || "", citations };
    }

    toolMessages.push({ role: "assistant", content: data.answer || null, tool_calls: calls });
    for (const call of calls) {
      let args = {};
      try {
        args = JSON.parse(call.function?.arguments || "{}");
      } catch (error) {
        args = {};
      }
      addReasoning("action", `Using ${prettyTool(call.function?.name)}.`);
      const result = executeTool(call.function?.name, args);
      toolMessages.push({ role: "tool", tool_call_id: call.id, content: String(result) });
    }
  }

  return { text: "", citations };
}

// Build a context payload that includes a real excerpt of each item's content
// so the model actually understands what the user uploaded, not just a label.
function memoryForContext(item) {
  const excerpt = item.content
    ? String(item.content).replace(/\s+/g, " ").trim().slice(0, 600)
    : "";
  return { name: item.name, type: item.type, summary: item.summary, excerpt };
}

function collectImagesForPrompt(prompt) {
  const images = state.memory.filter((item) => item.type === "image" && item.preview);
  if (!images.length) return [];
  const visual = /\b(image|photo|picture|screenshot|see|look|chart|graph|diagram|this)\b/i.test(prompt);
  if (!visual && state.mode !== "analyst") return [];
  return images.slice(-2).map((item) => item.preview);
}

// ---------------------------------------------------------------------------
// Tools — what VoiceMate can actually do
// ---------------------------------------------------------------------------

function executeTool(name, args) {
  args = args || {};
  switch (name) {
    case "remember_fact": {
      const text = String(args.text || "").trim();
      if (!text) return "Nothing to remember.";
      state.memory.push({
        type: "note",
        name: truncate(text, 42),
        summary: summarizeText(text),
        content: text,
        createdAt: new Date().toISOString()
      });
      renderMemory();
      toast("Saved to memory");
      return "Saved that to memory.";
    }
    case "search_memory": {
      const query = String(args.query || "").toLowerCase();
      const hits = state.memory
        .filter((item) => `${item.name} ${item.summary} ${item.content || ""}`.toLowerCase().includes(query))
        .slice(0, 5);
      return hits.length ? hits.map((item) => `${item.name}: ${item.summary}`).join(" | ") : "No matching memory found.";
    }
    case "add_reminder": {
      const text = String(args.text || "").trim();
      if (!text) return "No reminder text given.";
      state.reminders.push({ id: Date.now() + Math.random(), text, done: false, createdAt: new Date().toISOString() });
      renderReminders();
      toast("Reminder added");
      return `Added a reminder: ${text}.`;
    }
    case "list_reminders": {
      const open = state.reminders.filter((reminder) => !reminder.done);
      return open.length ? open.map((reminder, index) => `${index + 1}. ${reminder.text}`).join("; ") : "No reminders right now.";
    }
    case "complete_reminder": {
      const which = String(args.which || "").trim().toLowerCase();
      const openList = state.reminders.filter((reminder) => !reminder.done);
      const num = Number(which);
      let target = Number.isInteger(num) && openList[num - 1] ? openList[num - 1] : null;
      if (!target) target = openList.find((reminder) => reminder.text.toLowerCase().includes(which));
      if (!target) return "Couldn't find that reminder.";
      target.done = true;
      renderReminders();
      toast("Reminder completed");
      return `Marked done: ${target.text}.`;
    }
    case "set_voice": {
      const voice = String(args.voice || "").toLowerCase();
      if (!GROK_VOICES.find((persona) => persona.id === voice)) return "That voice isn't available.";
      selectPersona(voice, false);
      toast(`Voice set to ${getPersona().name}`);
      return `Voice set to ${getPersona().name}.`;
    }
    case "set_skill": {
      const skill = String(args.skill || "").toLowerCase();
      if (!SKILLS.find((item) => item.id === skill)) return "That skill isn't available.";
      setMode(skill, false);
      toast(`Switched to ${modeLabel()}`);
      return `Switched to ${modeLabel()}.`;
    }
    default:
      return "Unknown tool.";
  }
}

function prettyTool(name) {
  const labels = {
    remember_fact: "memory (save)",
    search_memory: "memory (search)",
    add_reminder: "reminders (add)",
    list_reminders: "reminders (list)",
    complete_reminder: "reminders (complete)",
    set_voice: "voice settings",
    set_skill: "skill switch"
  };
  return labels[name] || name || "a tool";
}

function renderCitations(bubble, citations) {
  const list = Array.isArray(citations) ? citations.filter(Boolean).slice(0, 5) : [];
  if (!list.length) return;
  const wrap = document.createElement("div");
  wrap.className = "citations";
  wrap.innerHTML =
    `<span>Sources</span>` +
    list
      .map((url, index) => {
        const href = typeof url === "string" ? url : url.url || "";
        let label = href;
        try {
          label = new URL(href).hostname.replace(/^www\./, "");
        } catch (error) {
          label = `Source ${index + 1}`;
        }
        return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
      })
      .join("");
  bubble.appendChild(wrap);
}

// ---------------------------------------------------------------------------
// Local fallback answers (used when the backend / Grok is not connected)
// ---------------------------------------------------------------------------

function answerPrompt(rawPrompt) {
  const prompt = rawPrompt.toLowerCase();
  const persona = getPersona();
  const memoryContext = summarizeMemoryForAnswer();
  const csvs = state.memory.filter((item) => item.type === "csv");
  const images = state.memory.filter((item) => item.type === "image");

  if (containsAny(prompt, ["voice model", "real voice", "human voice", "live voice", "talk out loud"])) {
    return "The natural live voice runs through the VoiceMate server. Start it, tap Start call, and I'll talk back in real time with natural pauses and barge-in. Right now this is the local preview.";
  }
  if (containsAny(prompt, ["what are you", "what do you do", "who are you", "voicemate"])) {
    return "I'm VoiceMate, a voice companion. I can chat, research things, give you a quick briefing, help you pitch, read your data, and coach you, and I show my reasoning while I work.";
  }
  if (containsAny(prompt, ["pitch", "sell", "demo", "client", "persuade"])) {
    return `${persona.name} here. Quick pitch: VoiceMate gives people one calm place to talk, drop in context, and get useful answers, out loud. The win is speed and clarity. Want me to tailor it to a specific audience?`;
  }
  if (containsAny(prompt, ["upload", "file", "remember", "what did i upload", "memory"])) {
    if (!state.memory.length) return "Nothing saved yet. Drop files or paste notes on the Memory page and I'll keep them in mind.";
    return `I'm holding ${state.memory.length} item${state.memory.length === 1 ? "" : "s"}: ${state.memory
      .map((item) => `${item.name}`)
      .join(", ")}.`;
  }
  if (containsAny(prompt, ["data", "csv", "numbers", "trend", "analyze"])) {
    if (!csvs.length) return "I don't see a CSV yet. Upload one and I'll call out rows, columns, averages, and anything that jumps out.";
    return csvs.map((csv) => `${csv.name}: ${csv.summary} ${csv.insights || ""}`).join(" ");
  }
  if (containsAny(prompt, ["image", "picture", "photo", "screenshot", "look at"])) {
    if (!images.length) return "No image yet. Add one and I'll read its details. Full visual understanding needs the multimodal model on the backend.";
    return images.map((image) => `${image.name}: ${image.summary}`).join(" ");
  }
  if (containsAny(prompt, ["briefing", "digest", "catch me up", "rundown", "good morning"])) {
    if (!state.memory.length) return "Here's your briefing: nothing in memory yet, so there's not much to report. Add notes or files and I'll build a proper rundown.";
    return `Quick briefing. ${memoryContext}. That's what I've got so far.`;
  }
  if (containsAny(prompt, ["research", "look up", "find out", "latest", "sources"])) {
    return "I'd normally research that with live search and cite the sources, but that needs the VoiceMate server running. Start it and ask again.";
  }
  return `Got it. We're in ${modeLabel()} mode. ${memoryContext === "no saved memory yet" ? "Ask me anything, or add a file for sharper answers." : `Here's what I'm keeping in mind: ${memoryContext}.`}`;
}

// ---------------------------------------------------------------------------
// Speaking: Grok TTS with a human touch, browser fallback
// ---------------------------------------------------------------------------

async function speak(text) {
  if (state.live) return; // realtime handles its own audio
  const speechText = humanizeForSpeech(text);
  if (!speechText) return;

  if (state.backendOnline) {
    try {
      setSpeechStatus("Speaking", false, true);
      const response = await fetch("/api/grok/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: speechText,
          voiceId: getPersona().id,
          speed: 1.0
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Voice request failed");
      }

      const audioBlob = await response.blob();
      stopCurrentAudio();
      state.currentAudioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(state.currentAudioUrl);
      state.currentAudio = audio;

      // Route through an analyser so the orb flows with the actual words.
      let analyser = null;
      const ctx = getAudioCtx();
      if (ctx) {
        try {
          const srcNode = ctx.createMediaElementSource(audio);
          analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          srcNode.connect(analyser);
          analyser.connect(ctx.destination);
        } catch (error) {
          analyser = null;
        }
      }

      audio.onended = () => {
        state.currentAudio = null;
        stopTtsReaction();
        setSpeechStatus("Ready", false, false);
        startListeningAfterSpeech();
      };
      audio.onerror = () => {
        state.currentAudio = null;
        stopTtsReaction();
        setSpeechStatus("Ready", false, false);
        startListeningAfterSpeech();
      };

      if (analyser) startTtsReaction(analyser);
      else setSpeechStatus("Speaking", false, true);
      await audio.play();
      return;
    } catch (error) {
      addActivity("Voice fallback", error.message || "Using the browser voice.");
      if (els.backendStatus) els.backendStatus.textContent = "Browser voice";
      if (!state.voiceErrorShown) {
        state.voiceErrorShown = true;
        addMessage(
          "agent",
          `Heads up, the natural voice didn't load (${error.message || "unknown error"}), so I'm using the browser voice for now. Check the server console for details.`
        );
      }
    }
  }

  speakWithBrowser(speechText);
}

function speakWithBrowser(text) {
  if (!window.speechSynthesis) return;
  // Browser voices can't read speech tags; strip them for the fallback.
  const clean = stripSpeechTags(text);
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const persona = getPersona();
  utterance.rate = persona.rate;
  utterance.pitch = persona.pitch;

  const preferred = pickBrowserVoice();
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => setSpeechStatus("Speaking", false, true);
  utterance.onend = () => {
    setSpeechStatus("Ready", false, false);
    startListeningAfterSpeech();
  };
  utterance.onerror = () => {
    setSpeechStatus("Ready", false, false);
    startListeningAfterSpeech();
  };
  window.speechSynthesis.speak(utterance);
}

function pickBrowserVoice() {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (!voices.length) return null;
  const preferredNames = [
    "Samantha",
    "Google US English",
    "Microsoft Aria Online (Natural)",
    "Microsoft Jenny Online (Natural)",
    "Ava",
    "Allison"
  ];
  for (const name of preferredNames) {
    const match = voices.find((voice) => voice.name === name);
    if (match) return match;
  }
  return voices.find((voice) => /en[-_]US/i.test(voice.lang)) || voices[0];
}

// Strip markdown/symbols that should never be read aloud, while keeping the
// Grok speech tags intact for the real TTS engine.
function humanizeForSpeech(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\((?:https?:[^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "that link")
    .replace(/^[\s>#-]*[-*]\s+/gm, "")
    .replace(/[*_#>]+/g, "")
    .replace(/[—–―−]+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripSpeechTags(text) {
  return noDashes(
    String(text || "")
      .replace(/<\/?[a-z-]+>/gi, "")
      .replace(/\[[a-z-]+\]/gi, "")
  );
}

// VoiceMate never shows or says a dash. Em/en dashes become a comma pause,
// hyphens become a space (so "co-founder" reads as "co founder").
function noDashes(text) {
  return String(text || "")
    .replace(/[—–―−]+/g, ", ")
    .replace(/(\w)-(\w)/g, "$1 $2")
    .replace(/\s-\s/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,(\s*,)+/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Realtime live call (Grok Voice speech-to-speech)
// ---------------------------------------------------------------------------

async function startLiveCall() {
  if (state.live) return;
  if (!state.backendOnline) {
    addMessage(
      "agent",
      "The live voice needs the VoiceMate server. Start it (npm start), open localhost, and tap Start call again."
    );
    addActivity("Live voice unavailable", "Voice server not connected.");
    return;
  }

  showPage("talk");
  setLiveButton(true, "Connecting...");
  addActivity("Starting call", "Requesting a secure voice session.");

  let live = {
    ws: null,
    ctx: null,
    stream: null,
    processor: null,
    source: null,
    rate: 24000,
    sources: new Set(),
    nextTime: 0,
    curUser: null,
    curUserText: "",
    lastUserFinal: "",
    curAsst: null,
    curAsstText: ""
  };
  state.live = live;

  try {
    // 1) Mic first, so we capture audio as early as possible.
    live.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    let ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (!REALTIME_SAMPLE_RATES.includes(ctx.sampleRate)) {
      await ctx.close();
      ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    if (ctx.state === "suspended") await ctx.resume();
    live.ctx = ctx;
    live.rate = ctx.sampleRate;

    // 2) Get an ephemeral client secret from our backend.
    const secretRes = await fetch("/api/grok/realtime-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voice: getPersona().id,
        mode: state.mode,
        memory: state.memory.map(memoryForContext)
      })
    });
    const secret = await secretRes.json();
    if (!secretRes.ok || !secret.value) {
      throw new Error(secret.error || "Could not start a voice session");
    }

    // 3) Connect straight to xAI realtime with the ephemeral token.
    const url = `wss://api.x.ai/v1/realtime?model=${encodeURIComponent(secret.model)}`;
    const ws = new WebSocket(url, [`xai-client-secret.${secret.value}`]);
    live.ws = ws;

    ws.addEventListener("open", () => {
      if (state.live !== live) return;
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            voice: getPersona().id,
            turn_detection: { type: "server_vad" },
            tools: REALTIME_TOOLS,
            tool_choice: "auto",
            audio: {
              input: {
                format: { type: "audio/pcm", rate: live.rate },
                transcription: { model: "grok-transcribe" }
              },
              output: { format: { type: "audio/pcm", rate: live.rate } }
            }
          }
        })
      );
      startMicStreaming(live);
      setLiveButton(true, "End call");
      setSpeechStatus("Live", true, false);
      if (els.backendStatus) els.backendStatus.textContent = "Live voice";
      if (els.voiceHint) els.voiceHint.textContent = "Listening, just talk";
      addActivity("Call connected", `Live with the ${getPersona().name} voice.`);
      addMessage("agent", "I'm live. Just start talking whenever you're ready.");
    });

    ws.addEventListener("message", (event) => handleRealtimeMessage(live, event.data));
    ws.addEventListener("error", () => {
      if (state.live === live) endLiveCall("The live connection hit an error.");
    });
    ws.addEventListener("close", () => {
      if (state.live === live) endLiveCall("The call disconnected.");
    });
  } catch (error) {
    addMessage("agent", `Couldn't start the call: ${error.message || "unknown error"}.`);
    addActivity("Live call failed", error.message || "Unknown error.");
    endLiveCall();
  }
}

function startMicStreaming(live) {
  const ctx = live.ctx;
  live.source = ctx.createMediaStreamSource(live.stream);
  live.processor = ctx.createScriptProcessor(4096, 1, 1);
  live.source.connect(live.processor);
  live.processor.connect(ctx.destination);

  // Analysers drive the audio-reactive orb.
  live.inAnalyser = ctx.createAnalyser();
  live.inAnalyser.fftSize = 256;
  live.source.connect(live.inAnalyser);
  live.outAnalyser = ctx.createAnalyser();
  live.outAnalyser.fftSize = 256;
  startOrbReaction(live);

  live.processor.onaudioprocess = (event) => {
    if (!live.ws || live.ws.readyState !== WebSocket.OPEN) return;
    const input = event.inputBuffer.getChannelData(0);
    const b64 = float32ToBase64PCM16(input);
    live.ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
  };
}

function analyserRms(analyser, buffer) {
  analyser.getByteTimeDomainData(buffer);
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    const v = (buffer[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buffer.length);
}

function startOrbReaction(live) {
  if (!els.voiceOrb) return;
  els.voiceOrb.classList.add("reacting");
  const inData = new Uint8Array(live.inAnalyser.fftSize);
  const outData = new Uint8Array(live.outAnalyser.fftSize);
  live.smooth = 0;
  const loop = () => {
    if (state.live !== live) return;
    const raw = Math.min(1, Math.max(analyserRms(live.inAnalyser, inData), analyserRms(live.outAnalyser, outData)) * 2.8);
    // Smooth the level so the orb flows instead of jittering.
    live.smooth += (raw - live.smooth) * 0.3;
    els.voiceOrb.style.setProperty("--level", live.smooth.toFixed(3));
    live.raf = requestAnimationFrame(loop);
  };
  live.raf = requestAnimationFrame(loop);
}

// Shared audio context for typed-reply playback analysis (warmed on first gesture).
let sharedAudioCtx = null;
function getAudioCtx() {
  try {
    if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
    return sharedAudioCtx;
  } catch (error) {
    return null;
  }
}

// Drive the orb from the spoken audio of a typed reply, smoothed so it flows.
function startTtsReaction(analyser) {
  setSpeechStatus("Speaking", false, true);
  if (!els.voiceOrb) return;
  els.voiceOrb.classList.add("reacting");
  const data = new Uint8Array(analyser.fftSize);
  state.smoothLevel = 0;
  const loop = () => {
    const raw = Math.min(1, analyserRms(analyser, data) * 3.4);
    state.smoothLevel += (raw - state.smoothLevel) * 0.3;
    els.voiceOrb.style.setProperty("--level", state.smoothLevel.toFixed(3));
    state.ttsRaf = requestAnimationFrame(loop);
  };
  state.ttsRaf = requestAnimationFrame(loop);
}

function stopTtsReaction() {
  if (state.ttsRaf) {
    cancelAnimationFrame(state.ttsRaf);
    state.ttsRaf = null;
  }
  state.smoothLevel = 0;
  if (els.voiceOrb) {
    els.voiceOrb.classList.remove("reacting");
    els.voiceOrb.style.removeProperty("--level");
  }
}

function handleRealtimeMessage(live, raw) {
  if (state.live !== live) return;
  const msg = safeParse(raw);
  if (!msg) return;

  switch (msg.type) {
    case "input_audio_buffer.speech_started":
      // Barge-in: user started talking, drop any queued assistant audio.
      stopLivePlayback(live);
      setSpeechStatus("Listening", true, false);
      break;

    // User speech updates ONE blue bubble for the current turn (corrections
    // replace the text in place, they never add a new bubble).
    case "conversation.item.input_audio_transcription.delta":
    case "conversation.item.input_audio_transcription.updated": {
      if (!live.curUser) {
        live.curUser = addMessage("user", "");
        live.curUser.classList.add("live-typing");
        live.curUserText = "";
      }
      live.curUserText =
        msg.transcript != null ? msg.transcript : live.curUserText + (msg.delta || "");
      live.curUser.textContent = live.curUserText;
      els.transcript.scrollTop = els.transcript.scrollHeight;
      break;
    }

    case "conversation.item.input_audio_transcription.completed": {
      const text = (msg.transcript || live.curUserText || "").trim();
      if (live.curUser) {
        live.curUser.classList.remove("live-typing");
        if (text) live.curUser.textContent = text;
        else live.curUser.remove();
      } else if (text && text !== live.lastUserFinal) {
        addMessage("user", text);
      }
      if (text) {
        state.history.push({ role: "user", content: text });
        live.lastUserFinal = text;
      }
      live.curUser = null;
      live.curUserText = "";
      break;
    }

    // Assistant speech streams into ONE bubble for the current response.
    case "response.output_audio_transcript.delta": {
      if (!live.curAsst) {
        live.curAsst = addMessage("agent", "");
        live.curAsst.classList.add("typing");
        live.curAsstText = "";
      }
      live.curAsstText += msg.delta || "";
      live.curAsst.textContent = stripSpeechTags(live.curAsstText);
      els.transcript.scrollTop = els.transcript.scrollHeight;
      break;
    }

    case "response.output_audio_transcript.done": {
      const finalText = stripSpeechTags(msg.transcript || live.curAsstText || "");
      if (live.curAsst) {
        live.curAsst.classList.remove("typing");
        if (finalText) live.curAsst.textContent = finalText;
        else live.curAsst.remove();
      } else if (finalText) {
        addMessage("agent", finalText);
      }
      if (finalText) state.history.push({ role: "assistant", content: finalText });
      live.curAsst = null;
      live.curAsstText = "";
      break;
    }

    case "response.output_audio.delta":
      if (msg.delta) enqueueLiveAudio(live, msg.delta);
      setSpeechStatus("Speaking", false, true);
      break;

    case "response.function_call_arguments.done": {
      let args = {};
      try {
        args = JSON.parse(msg.arguments || "{}");
      } catch (error) {
        args = {};
      }
      addReasoning("action", `Using ${prettyTool(msg.name)}.`);
      const result = executeTool(msg.name, args);
      if (live.ws && live.ws.readyState === WebSocket.OPEN) {
        live.ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: { type: "function_call_output", call_id: msg.call_id, output: String(result) }
          })
        );
        live.ws.send(JSON.stringify({ type: "response.create" }));
      }
      break;
    }

    case "response.done":
      if (live.curAsst) {
        live.curAsst.classList.remove("typing");
        live.curAsst = null;
        live.curAsstText = "";
      }
      setSpeechStatus("Live", true, false);
      break;

    case "error":
      addActivity("Realtime error", msg.error?.message || msg.message || "Unknown realtime error.");
      break;

    default:
      break;
  }
}

function enqueueLiveAudio(live, base64) {
  const float32 = base64PCM16ToFloat32(base64);
  if (!float32.length) return;
  const ctx = live.ctx;
  const buffer = ctx.createBuffer(1, float32.length, live.rate);
  buffer.getChannelData(0).set(float32);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  if (live.outAnalyser) source.connect(live.outAnalyser);

  const now = ctx.currentTime;
  if (live.nextTime < now) live.nextTime = now + 0.04;
  source.start(live.nextTime);
  live.nextTime += buffer.duration;
  live.sources.add(source);
  source.onended = () => live.sources.delete(source);
}

function stopLivePlayback(live) {
  live.sources.forEach((source) => {
    try {
      source.stop();
    } catch (error) {
      // already stopped
    }
  });
  live.sources.clear();
  live.nextTime = 0;
}

function endLiveCall(note) {
  const live = state.live;
  if (!live) {
    setLiveButton(false, "Start call");
    return;
  }
  state.live = null;

  try {
    if (live.raf) cancelAnimationFrame(live.raf);
    if (els.voiceOrb) {
      els.voiceOrb.classList.remove("reacting");
      els.voiceOrb.style.removeProperty("--level");
    }
    if (live.processor) {
      live.processor.disconnect();
      live.processor.onaudioprocess = null;
    }
    if (live.source) live.source.disconnect();
    if (live.stream) live.stream.getTracks().forEach((track) => track.stop());
    stopLivePlayback(live);
    if (live.ws && live.ws.readyState <= WebSocket.OPEN) live.ws.close();
    if (live.ctx && live.ctx.state !== "closed") live.ctx.close();
  } catch (error) {
    // ignore teardown errors
  }

  setLiveButton(false, "Start call");
  setSpeechStatus("Ready", false, false);
  updateGrokStatus();
  if (note) {
    addActivity("Call ended", note);
    addMessage("agent", note);
  }
}

function setLiveButton(active, label) {
  if (!els.liveButton) return;
  els.liveButton.classList.toggle("active", active);
  const lbl = els.liveButton.querySelector(".live-label");
  if (lbl) lbl.textContent = label;
  els.liveButton.setAttribute("aria-pressed", String(active));
  if (els.callIcon) els.callIcon.innerHTML = svgIcon(active ? "phone-off" : "phone");
}

function float32ToBase64PCM16(float32Array) {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return bytesToBase64(new Uint8Array(pcm16.buffer));
}

function base64PCM16ToFloat32(base64String) {
  const bytes = base64ToBytes(base64String);
  const usableLength = bytes.length - (bytes.length % 2);
  const pcm16 = new Int16Array(bytes.buffer, 0, usableLength / 2);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / 32768.0;
  }
  return float32;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64String) {
  const binary = atob(base64String);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Push-to-talk speech recognition (browser STT for typed-style turns)
// ---------------------------------------------------------------------------

function setupSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    els.micButton.disabled = false;
    setSpeechStatus("Type ready", false);
    return;
  }

  state.recognition = new Recognition();
  state.recognition.lang = "en-US";
  state.recognition.interimResults = false;
  state.recognition.continuous = false;

  state.recognition.onstart = () => {
    state.recognizing = true;
    els.micButton.classList.add("recording");
    setSpeechStatus("Listening", true);
    addActivity("Listening", "Microphone input started.");
  };

  state.recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    handlePrompt(transcript);
  };

  state.recognition.onerror = () => {
    setSpeechStatus("Type ready", false);
    addActivity("Voice input issue", "The browser blocked or skipped speech input.");
  };

  state.recognition.onend = () => {
    state.recognizing = false;
    els.micButton.classList.remove("recording");
    setSpeechStatus("Ready", false);
  };
}

function startListeningAfterSpeech() {
  if (!state.talkStarted || state.live || !state.recognition || state.recognizing) return;
  // Only auto-listen if the user had been using the mic.
  if (!state.autoListen) return;
  try {
    state.recognition.start();
  } catch (error) {
    addActivity("Tap mic to speak", "The browser needs a tap before listening again.");
  }
}

// ---------------------------------------------------------------------------
// Transcript + activity rendering
// ---------------------------------------------------------------------------

function setSpeechStatus(label, listening, speaking = false) {
  els.speechStatus.textContent = label;
  [els.voiceOrb, els.heroOrb].forEach((orb) => {
    if (!orb) return;
    orb.classList.toggle("listening", Boolean(listening));
    orb.classList.toggle("speaking", Boolean(speaking));
  });

  if (speaking) setEyeMode("speaking");
  else if (listening) setEyeMode("listening");
  else if (label === "Thinking") setEyeMode("thinking");
  else setEyeMode("idle");
}

// ---------------------------------------------------------------------------
// Living eyes: cursor-follow gaze, natural blinks/saccades, and states
// ---------------------------------------------------------------------------

const eyes = {
  els: [],
  gx: 0,
  gy: 0,
  tx: 0,
  ty: 0,
  mode: "idle",
  mouseX: 0,
  mouseY: 0,
  mouseTs: -9999,
  nextSaccade: 0
};

function setupEyes() {
  eyes.els = Array.from(document.querySelectorAll(".orb-eyes"));
  if (!eyes.els.length) return;
  window.addEventListener("mousemove", (event) => {
    eyes.mouseX = event.clientX;
    eyes.mouseY = event.clientY;
    eyes.mouseTs = performance.now();
  });
  scheduleBlink();
  requestAnimationFrame(eyeLoop);
}

function setEyeMode(mode) {
  if (eyes.mode === mode) return;
  eyes.mode = mode;
  eyes.els.forEach((el) => el.classList.toggle("alert", mode === "listening"));
}

function activeOrbRect() {
  const orb = document.body.classList.contains("talk-session") ? els.voiceOrb : els.heroOrb;
  const candidates = [orb, els.voiceOrb, els.heroOrb];
  for (const candidate of candidates) {
    if (candidate) {
      const rect = candidate.getBoundingClientRect();
      if (rect.width && rect.bottom > 0 && rect.top < window.innerHeight) return rect;
    }
  }
  return null;
}

function eyeLoop() {
  const now = performance.now();
  const mouseActive = now - eyes.mouseTs < 2500;
  const typing = document.activeElement === els.promptInput;

  if (eyes.mode === "speaking") {
    // Steady, with tiny life so it isn't a stare. Never follows the cursor.
    if (now > eyes.nextSaccade) {
      eyes.tx = (Math.random() - 0.5) * 0.18;
      eyes.ty = (Math.random() - 0.5) * 0.14;
      eyes.nextSaccade = now + 600 + Math.random() * 900;
    }
  } else if (eyes.mode === "thinking") {
    eyes.tx = -0.45;
    eyes.ty = -0.62;
  } else if (eyes.mode === "listening") {
    // In a voice call: stay engaged and forward, don't chase the mouse.
    if (now > eyes.nextSaccade) {
      eyes.tx = (Math.random() - 0.5) * 0.3;
      eyes.ty = (Math.random() - 0.5) * 0.2;
      eyes.nextSaccade = now + 900 + Math.random() * 1500;
    }
  } else if (typing) {
    // Look down toward the message box.
    eyes.tx = 0;
    eyes.ty = 0.55;
  } else if (!state.live && mouseActive) {
    // Follow the cursor only when idle (never during a call).
    const rect = activeOrbRect();
    if (rect) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      eyes.tx = clampEye((eyes.mouseX - cx) / (rect.width * 0.9));
      eyes.ty = clampEye((eyes.mouseY - cy) / (rect.height * 0.9));
    }
  } else if (now > eyes.nextSaccade) {
    // Idle wandering: occasional small glances, sometimes center.
    eyes.tx = Math.random() < 0.4 ? 0 : Math.random() * 1.2 - 0.6;
    eyes.ty = Math.random() * 0.7 - 0.35;
    eyes.nextSaccade = now + 1400 + Math.random() * 3000;
  }

  eyes.gx += (eyes.tx - eyes.gx) * 0.12;
  eyes.gy += (eyes.ty - eyes.gy) * 0.12;
  const transform = `translate(${(eyes.gx * 8).toFixed(2)}%, ${(eyes.gy * 6).toFixed(2)}%)`;
  for (const el of eyes.els) el.style.transform = transform;

  requestAnimationFrame(eyeLoop);
}

function scheduleBlink() {
  const delay = 1800 + Math.random() * 4200;
  window.setTimeout(() => {
    blinkOnce(() => {
      if (Math.random() < 0.25) window.setTimeout(() => blinkOnce(scheduleBlink), 180);
      else scheduleBlink();
    });
  }, delay);
}

function blinkOnce(done) {
  eyes.els.forEach((el) => el.classList.add("blinking"));
  window.setTimeout(() => {
    eyes.els.forEach((el) => el.classList.remove("blinking"));
    if (done) done();
  }, 120);
}

function clampEye(value) {
  return Math.min(1, Math.max(-1, value));
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = role === "user" ? text : noDashes(text);
  els.transcript.appendChild(message);
  els.transcript.scrollTop = els.transcript.scrollHeight;
  return message;
}

function getTranscriptText() {
  return [...els.transcript.querySelectorAll(".message")]
    .map((message) => {
      const speaker = message.classList.contains("user") ? "You" : "VoiceMate";
      const clone = message.cloneNode(true);
      const cites = clone.querySelector(".citations");
      if (cites) cites.remove();
      return `${speaker}: ${clone.textContent.trim()}`;
    })
    .filter(Boolean)
    .join("\n");
}

function addActivity(title, detail) {
  addTrace("system", title, detail);
}

function addReasoning(type, text) {
  const titles = { thought: "Thinking", action: "Doing", observation: "Noticed" };
  addTrace(type, titles[type] || "Step", text);
}

function addTrace(type, title, detail) {
  const item = document.createElement("div");
  item.className = `activity-item trace-${type}`;
  item.innerHTML = `<span></span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></div>`;
  els.activityFeed.prepend(item);
  while (els.activityFeed.children.length > 60) {
    els.activityFeed.removeChild(els.activityFeed.lastChild);
  }
}

// ---------------------------------------------------------------------------
// Memory + files
// ---------------------------------------------------------------------------

function renderMemory() {
  saveState();
  els.memoryGrid.innerHTML = "";
  if (!state.memory.length) {
    const empty = document.createElement("div");
    empty.className = "memory-empty";
    empty.innerHTML = `
      <span class="empty-icon">${svgIcon("sparkles")}</span>
      <strong>Nothing saved yet</strong>
      <p>Use the buttons above to add files, photos, or a note. VoiceMate will remember them for this conversation.</p>
    `;
    els.memoryGrid.appendChild(empty);
    return;
  }

  state.memory
    .map((item, index) => ({ item, index }))
    .reverse()
    .forEach(({ item, index }) => {
      const row = document.createElement("article");
      row.className = "memory-item";
      const tint = memoryTint(item.type);
      const visual = item.preview
        ? `<span class="mem-thumb"><img src="${item.preview}" alt="${escapeHtml(item.name)} preview" /></span>`
        : `<span class="mem-icon" style="--tint:${tint}">${svgIcon(memoryIconName(item.type))}</span>`;
      row.innerHTML = `
        ${visual}
        <div class="mem-text">
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.summary)}</p>
        </div>
        <span class="mem-tag" style="color:${tint};background:${hexToSoft(tint)}">${escapeHtml(memoryLabel(item.type))}</span>
        <button class="mem-delete" type="button" aria-label="Remove ${escapeHtml(item.name)}">${svgIcon("trash")}</button>
      `;
      row.querySelector(".mem-delete").addEventListener("click", () => removeMemory(index));
      els.memoryGrid.appendChild(row);
    });
}

function removeMemory(index) {
  const item = state.memory[index];
  state.memory.splice(index, 1);
  renderMemory();
  addActivity("Removed", `${item ? item.name : "Item"} removed from memory.`);
}

function saveManualContext() {
  const content = els.manualContext.value.trim();
  if (!content) {
    addActivity("Memory not saved", "Paste text first.");
    return;
  }
  state.memory.push({
    type: "note",
    name: `Pasted context ${state.memory.length + 1}`,
    summary: summarizeText(content),
    content,
    createdAt: new Date().toISOString()
  });
  els.manualContext.value = "";
  renderMemory();
  addActivity("Saved memory", "Pasted context was added.");
  addMessage("agent", "Got it, I saved that to memory.");
}

async function handleKnowledgeFiles(files) {
  if (!files.length) return;
  for (const file of files) {
    const text = await file.text();
    const type = file.name.toLowerCase().endsWith(".csv") ? "csv" : "note";
    const item =
      type === "csv"
        ? summarizeCsv(file.name, text)
        : {
            type,
            name: file.name,
            summary: summarizeText(text),
            content: text.slice(0, 20000),
            createdAt: new Date().toISOString()
          };
    state.memory.push(item);
    addActivity("Read file", `${file.name} was added.`);
  }
  renderMemory();
  addMessage("agent", `Added ${files.length} file${files.length === 1 ? "" : "s"} to memory.`);
}

async function handleImageFiles(files) {
  if (!files.length) return;
  for (const file of files) {
    const preview = await readAsDataUrl(file);
    const dimensions = await getImageDimensions(preview);
    const summary = `Image, ${(file.size / 1024).toFixed(1)} KB, ${dimensions.width} by ${dimensions.height} pixels.`;
    state.memory.push({
      type: "image",
      name: file.name,
      summary,
      preview,
      content: `${file.name} ${summary}`,
      createdAt: new Date().toISOString()
    });
    addActivity("Read image", `${file.name} was added.`);
  }
  renderMemory();
  addMessage("agent", `Added ${files.length} image${files.length === 1 ? "" : "s"} to memory.`);
}

// ---------------------------------------------------------------------------
// Backend status
// ---------------------------------------------------------------------------

function updateGrokStatus() {
  if (state.backendOnline) {
    els.grokStatus.textContent = "Connected. Natural live voice is ready.";
    els.backendStatus.textContent = "VoiceMate voice";
    els.backendStatus.classList.add("connected");
    if (els.voiceHint) els.voiceHint.textContent = "Tap Start call to talk out loud";
    return;
  }
  els.backendStatus.textContent = "Browser voice";
  els.backendStatus.classList.remove("connected");
  els.grokStatus.textContent = "Offline. Run the VoiceMate server to unlock the natural live voice.";
  if (els.voiceHint) els.voiceHint.textContent = "Run the server for the natural live voice";
}

async function checkBackend() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const data = await response.json();
    state.backendOnline = Boolean(response.ok && data.xaiConfigured);
    state.backendModel = data.model || "";
    state.realtimeModel = data.realtimeModel || "";
    if (state.backendOnline) {
      addActivity("Voice engine connected", "Natural live voice is ready.");
    } else if (response.ok) {
      addActivity("Voice key missing", "Add your voice key to .env.local on the server.");
    }
  } catch (error) {
    state.backendOnline = false;
  }
  updateGrokStatus();
}

// ---------------------------------------------------------------------------
// Small utilities + summarizers
// ---------------------------------------------------------------------------

function getPersona() {
  return GROK_VOICES.find((persona) => persona.id === state.persona) || GROK_VOICES[0];
}

function modeLabel() {
  const skill = SKILLS.find((item) => item.id === state.mode);
  return skill ? skill.name : "Natural chat";
}

function memoryIconName(type) {
  if (type === "csv") return "table";
  if (type === "image") return "photo";
  if (type === "note") return "doc";
  return "sparkles";
}

function memoryLabel(type) {
  if (type === "csv") return "Data";
  if (type === "image") return "Photo";
  if (type === "note") return "Note";
  if (type === "brief") return "Brief";
  return type;
}

function memoryTint(type) {
  const tints = { csv: "#34c759", image: "#0a84ff", note: "#ff9f0a", brief: "#5e5ce6" };
  return tints[type] || "#8e8e93";
}

function summarizeMemoryForAnswer() {
  if (!state.memory.length) return "no saved memory yet";
  return state.memory
    .slice(-4)
    .map((item) => `${item.name}: ${item.summary}`)
    .join(" | ");
}

function summarizeText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "Empty text.";
  const words = normalized.split(/\s+/).length;
  const firstSentence = normalized.split(/[.!?]/)[0].trim().slice(0, 190);
  const keywords = topKeywords(normalized).slice(0, 5);
  return `${words} words. Starts with: "${firstSentence}".${keywords.length ? ` Keywords: ${keywords.join(", ")}.` : ""}`;
}

function summarizeCsv(name, text) {
  const rows = parseCsv(text);
  const headers = rows[0] || [];
  const dataRows = rows.slice(1).filter((row) => row.some(Boolean));
  const numericSummaries = summarizeNumericColumns(headers, dataRows);
  const insights = numericSummaries.length
    ? `Numeric columns: ${numericSummaries.join("; ")}.`
    : "No obvious numeric columns found.";
  return {
    type: "csv",
    name,
    summary: `${dataRows.length} rows and ${headers.length} columns. Columns: ${headers.slice(0, 8).join(", ")}.`,
    insights,
    content: text.slice(0, 30000),
    createdAt: new Date().toISOString()
  };
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

function summarizeNumericColumns(headers, rows) {
  return headers
    .map((header, columnIndex) => {
      const values = rows
        .map((row) => Number(String(row[columnIndex] || "").replace(/[$,%]/g, "")))
        .filter((value) => Number.isFinite(value));
      if (values.length < Math.max(2, rows.length * 0.5)) return null;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const average = values.reduce((sum, value) => sum + value, 0) / values.length;
      return `${header || `Column ${columnIndex + 1}`} avg ${round(average)}, min ${round(min)}, max ${round(max)}`;
    })
    .filter(Boolean)
    .slice(0, 5);
}

function topKeywords(text) {
  const stop = new Set([
    "the", "and", "for", "that", "with", "this", "you", "your", "are", "from",
    "into", "can", "will", "have", "has", "was", "our", "about"
  ]);
  const counts = new Map();
  text
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9]{2,}/g)
    ?.forEach((word) => {
      if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
    });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([word]) => word);
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = src;
  });
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function containsAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// SF Symbols-style icon set (clean stroke SVGs, no emoji)
// ---------------------------------------------------------------------------

const ICONS = {
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v-4M12 15V8M17 15v-7"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  sparkles: '<path d="M12 3l1.8 4.9L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  paperclip:
    '<path d="m21.4 11.1-9.2 9.2a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 0 1 5 5l-9.2 9.1a2 2 0 0 1-2.8-2.8l8.5-8.5"/>',
  "arrow-up": '<path d="M12 19V5M5 12l7-7 7 7"/>',
  phone:
    '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  "phone-off":
    '<path d="M11 6.9a16 16 0 0 1 9 9M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 4 9 2 2 0 0 1 6 6.8M2 2l20 20"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/>',
  text: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  theme: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  waveform: '<path d="M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16v-4M12 8h.01"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M18 6l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
  home: '<path d="m3 9.5 9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
  gear:
    '<circle cx="12" cy="12" r="3"/><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/>'
};

function svgIcon(name) {
  const inner = ICONS[name] || ICONS.info;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    if (el.dataset.iconDone === "1") return;
    el.innerHTML = svgIcon(el.dataset.icon);
    if (el.dataset.tint) {
      el.style.setProperty("--tint", el.dataset.tint);
    }
    el.dataset.iconDone = "1";
  });
}

function logoSvg(id) {
  return `
  <svg viewBox="0 0 44 44" aria-hidden="true">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c5cff"/>
        <stop offset="1" stop-color="#00a3ff"/>
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="40" height="40" rx="12" fill="url(#${id})"/>
    <g fill="#fff">
      <rect x="11.5" y="18" width="3.2" height="8" rx="1.6"/>
      <rect x="17" y="14.5" width="3.2" height="15" rx="1.6"/>
      <rect x="22.5" y="11" width="3.2" height="22" rx="1.6"/>
      <rect x="28" y="16" width="3.2" height="12" rx="1.6"/>
    </g>
    <circle cx="32.5" cy="11.5" r="2.4" fill="#fff"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Persistence (memory, reminders, voice, skill survive reloads)
// ---------------------------------------------------------------------------

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.memory) && data.memory.length) state.memory = data.memory;
    if (Array.isArray(data.reminders)) state.reminders = data.reminders;
    if (data.persona && GROK_VOICES.find((persona) => persona.id === data.persona)) state.persona = data.persona;
    if (data.mode && SKILLS.find((skill) => skill.id === data.mode)) state.mode = data.mode;
  } catch (error) {
    // ignore storage errors
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        memory: state.memory,
        reminders: state.reminders,
        persona: state.persona,
        mode: state.mode
      })
    );
  } catch (error) {
    // ignore storage errors (quota, private mode)
  }
}

function exportData() {
  const blob = new Blob(
    [JSON.stringify({ memory: state.memory, reminders: state.reminders }, null, 2)],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "voicemate-memory.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  toast("Exported memory");
}

async function importData(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (Array.isArray(data.memory)) state.memory = state.memory.concat(data.memory);
    if (Array.isArray(data.reminders)) state.reminders = state.reminders.concat(data.reminders);
    renderMemory();
    renderReminders();
    toast("Imported memory");
  } catch (error) {
    toast("Couldn't read that file");
  }
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

function renderReminders() {
  saveState();
  if (!els.reminderList) return;
  els.reminderList.innerHTML = "";
  const open = state.reminders.filter((reminder) => !reminder.done);
  if (!open.length) {
    const empty = document.createElement("p");
    empty.className = "reminder-empty";
    empty.textContent = "No reminders yet. Add one, or ask VoiceMate to remind you.";
    els.reminderList.appendChild(empty);
    return;
  }
  open
    .slice()
    .reverse()
    .forEach((reminder) => {
      const row = document.createElement("div");
      row.className = "reminder-item";
      row.innerHTML = `
        <button class="reminder-check" type="button" aria-label="Complete">${svgIcon("check")}</button>
        <span>${escapeHtml(reminder.text)}</span>
      `;
      row.querySelector(".reminder-check").addEventListener("click", () => {
        reminder.done = true;
        renderReminders();
        toast("Reminder completed");
      });
      els.reminderList.appendChild(row);
    });
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

let toastHost = null;

function toast(message) {
  if (!toastHost) {
    toastHost = document.createElement("div");
    toastHost.className = "toast-host";
    document.body.appendChild(toastHost);
  }
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  toastHost.appendChild(item);
  requestAnimationFrame(() => item.classList.add("show"));
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 260);
  }, 2600);
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts + PWA
// ---------------------------------------------------------------------------

function setupShortcuts() {
  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "");

    if (event.key === "Escape") {
      if (state.live) endLiveCall("Call ended.");
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      showPage("talk");
      els.promptInput.focus();
      return;
    }
    if (event.key === "/" && !typing) {
      event.preventDefault();
      showPage("talk");
      els.promptInput.focus();
    }
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https?:$/.test(window.location.protocol)) return; // skip on file://
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // offline support is optional
    });
  });
}

function truncate(value, max) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
}

// ---------------------------------------------------------------------------
// Theme (System / Light / Dark)
// ---------------------------------------------------------------------------

function applyStoredTheme() {
  applyTheme(getStoredTheme());
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
  }
}

function getStoredTheme() {
  try {
    return localStorage.getItem("voicemate.theme") || "light";
  } catch (error) {
    return "light";
  }
}

function setTheme(pref) {
  try {
    localStorage.setItem("voicemate.theme", pref);
  } catch (error) {
    // ignore storage errors
  }
  applyTheme(pref);
  addActivity("Theme", `Switched to ${pref}.`);
}

function applyTheme(pref) {
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = pref === "dark" || (pref === "system" && prefersDark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  if (els.themeSeg) {
    els.themeSeg.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.theme === pref);
    });
  }
}

function hexToSoft(hex, alpha = 0.14) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return "rgba(0, 122, 255, 0.12)";
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Track whether the user has used the mic so we don't auto-listen unexpectedly.
document.addEventListener("click", (event) => {
  // Warm the audio context on a user gesture so playback analysis works.
  getAudioCtx();
  if (event.target.closest && event.target.closest("#micButton")) {
    state.autoListen = true;
  }
});

init();
