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
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
        due: { type: "string" },
        contact: { type: "string", description: "Optional email address or phone number to prepare a reminder message." }
      },
      required: ["text"]
    }
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
    name: "send_reminder",
    description: "Prepare an email or text message for a reminder using the user's device.",
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
  },
  {
    name: "get_current_time",
    description: "Get the current local date and time.",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "calculate",
    description: "Evaluate a basic arithmetic expression.",
    parameters: { type: "object", properties: { expression: { type: "string" } }, required: ["expression"] }
  },
  {
    name: "get_weather",
    description: "Get the current weather for a place.",
    parameters: { type: "object", properties: { location: { type: "string" } }, required: ["location"] }
  },
  {
    name: "open_link",
    description: "Open a web URL in the browser.",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
  }
];

const REALTIME_TOOLS = TOOL_DEFS.map((tool) => ({ type: "function", ...tool }));

const STORE_KEY = "voicemate.state.v1";
const ASSET_DB = "voicemate.assets.v1";
const ASSET_STORE = "assets";
const ONBOARDING_KEY = "voicemate.onboarding.v1";

const state = {
  memory: [...STARTER_MEMORY],
  reminders: [],
  persona: "ara",
  mode: "companion",
  language: "auto",
  recognition: null,
  recognizing: false,
  backendOnline: false,
  backendModel: "",
  realtimeModel: "",
  talkStarted: false,
  history: [],
  conversations: [],
  currentConvo: null,
  uploadContext: { ids: [], createdAt: 0 },
  contextOpen: false,
  wakeEnabled: false,
  wakeRec: null,
  currentAudioUrl: "",
  currentAudio: null,
  streaming: false,
  live: null
};

const LANGUAGES = [
  { id: "auto", name: "Auto-detect" },
  { id: "en", name: "English" },
  { id: "es-ES", name: "Spanish" },
  { id: "fr", name: "French" },
  { id: "de", name: "German" },
  { id: "it", name: "Italian" },
  { id: "pt-BR", name: "Portuguese" },
  { id: "hi", name: "Hindi" },
  { id: "zh", name: "Chinese" },
  { id: "ja", name: "Japanese" },
  { id: "ko", name: "Korean" },
  { id: "ru", name: "Russian" },
  { id: "ar-SA", name: "Arabic" },
  { id: "tr", name: "Turkish" },
  { id: "vi", name: "Vietnamese" },
  { id: "id", name: "Indonesian" }
];

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
    homeDashboard: document.querySelector("#homeDashboard"),
    quickPrompts: document.querySelector("#quickPrompts"),
    activityFeed: document.querySelector("#activityFeed"),
    talkContextPanel: document.querySelector("#talkContextPanel"),
    thinkingDrawer: document.querySelector("#thinkingDrawer"),
    talkTrace: document.querySelector("#talkTrace"),
    thinkingSummary: document.querySelector("#thinkingSummary"),
    contextTitle: document.querySelector("#contextTitle"),
    contextChips: document.querySelector("#contextChips"),
    contextButton: document.querySelector("#contextButton"),
    contextBackdrop: document.querySelector("#contextBackdrop"),
    closeContextSheet: document.querySelector("#closeContextSheet"),
    clearActiveContext: document.querySelector("#clearActiveContext"),
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
    reminderDueInput: document.querySelector("#reminderDueInput"),
    reminderContactInput: document.querySelector("#reminderContactInput"),
    addReminder: document.querySelector("#addReminder"),
    exportData: document.querySelector("#exportData"),
    importData: document.querySelector("#importData"),
    historyButton: document.querySelector("#historyButton"),
    historyModal: document.querySelector("#historyModal"),
    historyList: document.querySelector("#historyList"),
    historySearch: document.querySelector("#historySearch"),
    historyClose: document.querySelector("#historyClose"),
    cameraButton: document.querySelector("#cameraButton"),
    langSelect: document.querySelector("#langSelect"),
    wakeToggle: document.querySelector("#wakeToggle"),
    onboardingModal: document.querySelector("#onboardingModal"),
    onboardingSkip: document.querySelector("#onboardingSkip"),
    onboardingLater: document.querySelector("#onboardingLater"),
    onboardingStart: document.querySelector("#onboardingStart")
  });
}

function init() {
  cacheEls();
  loadState();
  ensureMemoryIds();
  applyStoredTheme();
  if (els.brandLogo) els.brandLogo.innerHTML = logoSvg("vmlogo1");
  if (els.talkLogo) els.talkLogo.innerHTML = logoSvg("vmlogo2");
  renderIcons();
  renderSkills();
  renderHomeDashboard();
  renderPersonas();
  renderQuickPrompts();
  renderMemory();
  renderContextChips();
  renderReminders();
  scheduleAllReminderNotifications();
  renderLanguages();
  if (els.agentMode) els.agentMode.value = state.mode;
  if (els.wakeToggle) els.wakeToggle.checked = state.wakeEnabled;
  updateModeCaption();
  updateGrokStatus();
  setLiveButton(false, "Start live call");
  setupSpeechRecognition();
  setupShortcuts();
  setupEyes();
  registerServiceWorker();
  wireEvents();
  restoreMemoryAssets().then(() => {
    renderMemory();
    renderContextChips();
  });

  addActivity("Started session", "Voice, skills, files, and memory are ready.");

  const pageFromHash = window.location.hash.replace("#", "");
  const initialPage = pageFromHash === "setup" ? "settings" : pageFromHash;
  checkBackend().finally(() => {
    if (["home", "talk", "memory", "settings"].includes(initialPage)) {
      showPage(initialPage);
    }
    window.requestAnimationFrame(() => document.body.classList.add("ui-ready"));
    maybeShowOnboarding();
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
      executeTool("add_reminder", {
        text,
        due: (els.reminderDueInput?.value || "").trim(),
        contact: (els.reminderContactInput?.value || "").trim()
      });
      els.reminderInput.value = "";
      if (els.reminderDueInput) els.reminderDueInput.value = "";
      if (els.reminderContactInput) els.reminderContactInput.value = "";
    });
    els.reminderInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        els.addReminder.click();
      }
    });
  }
  if (els.clearActiveContext) {
    els.clearActiveContext.addEventListener("click", () => {
      state.uploadContext = { ids: [], createdAt: 0 };
      state.contextOpen = false;
      saveState();
      renderContextChips();
      renderMemory();
      addActivity("Context cleared", "VoiceMate will use general memory instead of a specific upload.");
    });
  }
  if (els.contextButton) {
    els.contextButton.addEventListener("click", () => {
      if (state.contextOpen) closeContextSheet();
      else openContextSheet();
    });
  }
  if (els.contextBackdrop) els.contextBackdrop.addEventListener("click", closeContextSheet);
  if (els.closeContextSheet) els.closeContextSheet.addEventListener("click", closeContextSheet);
  [els.onboardingSkip, els.onboardingLater].forEach((button) => {
    if (button) button.addEventListener("click", dismissOnboarding);
  });
  if (els.onboardingStart) {
    els.onboardingStart.addEventListener("click", () => {
      dismissOnboarding();
      showPage("talk");
      if (els.promptInput) els.promptInput.focus();
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
    if (!confirm("Clear all saved memory on this device? This cannot be undone.")) return;
    state.memory = [];
    state.uploadContext = { ids: [], createdAt: 0 };
    renderMemory();
    renderContextChips();
    addActivity("Cleared memory", "Session memory is empty.");
    addMessage("agent", "Done, I cleared everything I was remembering for this session.");
  });

  els.clearTranscript.addEventListener("click", () => {
    els.transcript.innerHTML = "";
    if (els.talkTrace) els.talkTrace.innerHTML = "";
    if (els.thinkingSummary) els.thinkingSummary.textContent = "VoiceMate will show context, sources, and tools here.";
    updateTalkChrome();
    newConversation();
    state.talkStarted = false;
    addActivity("Started new chat", "Saved the last one and started fresh.");
    if (document.body.classList.contains("talk-session")) {
      startTalkSession();
    }
  });

  if (els.historyButton) els.historyButton.addEventListener("click", openHistory);
  if (els.historyClose) els.historyClose.addEventListener("click", closeHistory);
  if (els.historyModal) {
    els.historyModal.addEventListener("click", (event) => {
      if (event.target === els.historyModal) closeHistory();
    });
  }
  if (els.historySearch) {
    els.historySearch.addEventListener("input", () => renderConversations(els.historySearch.value));
  }
  if (els.cameraButton) els.cameraButton.addEventListener("click", handleCamera);
  if (els.langSelect) {
    els.langSelect.addEventListener("change", (event) => {
      state.language = event.target.value;
      if (state.recognition) state.recognition.lang = recognitionLanguage();
      saveState();
      updateLiveSession({ instructions: liveSessionHint() });
      addActivity("Language set", `Voice language is ${event.target.options[event.target.selectedIndex].text}.`);
    });
  }
  if (els.wakeToggle) {
    els.wakeToggle.addEventListener("change", (event) => {
      state.wakeEnabled = event.target.checked;
      saveState();
      updateWake();
      toast(state.wakeEnabled ? "Wake phrase on" : "Wake phrase off");
    });
  }

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
      id: createMemoryId("note"),
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

async function routeFiles(files) {
  const images = files.filter((file) => file.type.startsWith("image/"));
  const docs = files.filter((file) => !file.type.startsWith("image/"));
  const added = [];
  if (docs.length) added.push(...(await handleKnowledgeFiles(docs, { activate: false })));
  if (images.length) added.push(...(await handleImageFiles(images, { activate: false })));
  if (added.length) noteUploadContext(added);
}

function createMemoryId(prefix = "m") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function ensureMemoryIds() {
  state.memory.forEach((item) => {
    if (!item.id) item.id = createMemoryId(memoryPrefix(item.type));
  });
}

function memoryPrefix(type) {
  if (type === "image") return "img";
  if (type === "csv") return "csv";
  if (type === "brief") return "brief";
  return "mem";
}

function noteUploadContext(items, options = {}) {
  const ids = items.map((item) => item.id).filter(Boolean);
  if (!ids.length) return;
  state.uploadContext = { ids, createdAt: Date.now() };
  saveState();
  renderContextChips();
  const names = items.map((item) => item.name).filter(Boolean).join(", ");
  addActivity("Context ready", names ? `VoiceMate can use ${names} in this chat.` : "VoiceMate can use the upload now.");
  shareMemoryWithLive(items, options);
}

function uploadContextItems() {
  const ids = state.uploadContext && Array.isArray(state.uploadContext.ids) ? state.uploadContext.ids : [];
  const byId = new Map(state.memory.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

function activeUploadItems() {
  const recent = uploadContextItems();
  if (recent.length) return recent;
  return state.memory.filter((item) => item.type !== "brief").slice(-4);
}

function promptRefersToUploads(prompt) {
  const text = String(prompt || "").toLowerCase();
  return /\b(upload|uploaded|attach|attached|attachment|file|document|doc|csv|spreadsheet|note|image|photo|picture|screenshot|camera|chart|graph|diagram|this|that|these|those|it|what i sent|what i gave you|look at|see)\b/.test(
    text
  );
}

function collectImagesForPrompt(prompt) {
  const images = state.memory.filter((item) => item.type === "image" && item.preview);
  if (!images.length) return [];
  const activeImages = activeUploadItems().filter((item) => item.type === "image" && item.preview);
  const visual = promptRefersToUploads(prompt) || state.mode === "analyst";
  const selected = visual ? activeImages.concat(images.slice(-2)) : activeImages;
  const unique = [];
  const seen = new Set();
  for (const item of selected) {
    const key = item.id || item.name;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 3) break;
  }
  return unique.map(imageForModel);
}

function imageForModel(item) {
  return {
    name: item.name,
    summary: item.summary,
    url: item.preview
  };
}

function renderHomeDashboard() {
  if (!els.homeDashboard) return;
  const active = activeUploadItems().filter((item) => item.type !== "brief");
  const openReminders = state.reminders.filter((reminder) => !reminder.done);
  const lastConvo = state.conversations.find((convo) => convo.titled);
  const cards = [
    {
      icon: "waveform",
      tint: "#0a84ff",
      title: state.backendOnline ? "Live voice ready" : "Browser preview",
      body: state.backendOnline ? "Start a natural live call." : "Run the server for natural live voice.",
      action: "Talk",
      onClick: () => showPage("talk")
    },
    {
      icon: active.length ? memoryIconName(active[active.length - 1].type) : "archive",
      tint: "#34c759",
      title: active.length ? `${active.length} active context item${active.length === 1 ? "" : "s"}` : "No active context",
      body: active.length ? active.map((item) => item.name).slice(-2).join(", ") : "Upload a file, note, or photo.",
      action: active.length ? "Review" : "Add",
      onClick: () => (active.length ? openContextSheet() : showPage("memory"))
    },
    {
      icon: "check",
      tint: "#ff2d55",
      title: openReminders.length ? `${openReminders.length} open reminder${openReminders.length === 1 ? "" : "s"}` : "No reminders",
      body: openReminders[0] ? formatReminder(openReminders[0]) : "Ask VoiceMate to remind you.",
      action: "Reminders",
      onClick: () => showPage("settings")
    },
    {
      icon: "history",
      tint: "#5e5ce6",
      title: lastConvo ? "Continue" : "Start fresh",
      body: lastConvo ? lastConvo.title : "Begin a new chat or live call.",
      action: lastConvo ? "Resume" : "Start",
      onClick: () => (lastConvo ? resumeConversation(lastConvo.id) : showPage("talk"))
    }
  ];

  els.homeDashboard.innerHTML = cards
    .map(
      (card, index) => `
        <button class="dashboard-card" type="button" data-card="${index}">
          <span class="dash-icon" style="--tint:${card.tint}">${svgIcon(card.icon)}</span>
          <span><strong>${escapeHtml(card.title)}</strong><small>${escapeHtml(card.body)}</small></span>
          <em>${escapeHtml(card.action)}</em>
        </button>
      `
    )
    .join("");
  els.homeDashboard.querySelectorAll(".dashboard-card").forEach((button) => {
    const card = cards[Number(button.dataset.card)];
    button.addEventListener("click", card.onClick);
  });
}

function maybeShowOnboarding() {
  if (!els.onboardingModal) return;
  if (localStorage.getItem(ONBOARDING_KEY) === "done") return;
  window.setTimeout(() => {
    els.onboardingModal.hidden = false;
    els.onboardingStart?.focus();
  }, 500);
}

function dismissOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "done");
  if (els.onboardingModal) els.onboardingModal.hidden = true;
}

function renderContextChips() {
  if (!els.contextChips || !els.contextTitle) return;
  const active = uploadContextItems();
  els.contextChips.innerHTML = "";
  if (els.contextButton) {
    els.contextButton.textContent = active.length ? `Context (${active.length})` : "Context";
    els.contextButton.disabled = !active.length;
  }
  if (els.talkContextPanel) els.talkContextPanel.hidden = !active.length || !state.contextOpen;
  if (els.contextBackdrop) els.contextBackdrop.hidden = !active.length || !state.contextOpen;
  els.contextTitle.textContent = active.length
    ? `${active.length} active item${active.length === 1 ? "" : "s"}`
    : "Nothing active yet";
  if (!active.length) {
    if (els.contextBackdrop) els.contextBackdrop.hidden = true;
    updateTalkChrome();
    renderHomeDashboard();
    return;
  }

  active.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "context-chip";
    chip.innerHTML = `
      <span class="chip-icon">${svgIcon(memoryIconName(item.type))}</span>
      <span class="chip-text">
        <strong>${escapeHtml(item.name || "Memory item")}</strong>
        <small>${escapeHtml(memoryLabel(item.type))} · ${escapeHtml((item.summary || "").slice(0, 80))}</small>
      </span>
      <button type="button" aria-label="Ask about ${escapeHtml(item.name || "this item")}">Ask</button>
      <button type="button" class="chip-remove" aria-label="Remove ${escapeHtml(item.name || "this item")} from context">&times;</button>
    `;
    const buttons = chip.querySelectorAll("button");
    buttons[0].addEventListener("click", () => {
      showPage("talk");
      handlePrompt(`Talk about ${item.name || "this upload"}. What should I know?`);
    });
    buttons[1].addEventListener("click", () => removeFromActiveContext(item.id));
    els.contextChips.appendChild(chip);
  });
  updateTalkChrome();
  renderHomeDashboard();
}

function openContextSheet() {
  const active = uploadContextItems();
  if (!active.length) return;
  state.contextOpen = true;
  renderContextChips();
}

function closeContextSheet() {
  state.contextOpen = false;
  renderContextChips();
}

function removeFromActiveContext(id) {
  state.uploadContext.ids = (state.uploadContext.ids || []).filter((itemId) => itemId !== id);
  saveState();
  renderContextChips();
  renderMemory();
  addActivity("Context updated", "Removed one item from active context.");
}

function activateMemoryItem(item) {
  if (!item || !item.id) return;
  const ids = new Set(state.uploadContext.ids || []);
  ids.add(item.id);
  state.uploadContext = { ids: [...ids], createdAt: Date.now() };
  state.contextOpen = true;
  saveState();
  renderContextChips();
  renderMemory();
  shareMemoryWithLive([item]);
  addActivity("Context added", `${item.name || "Memory item"} is active in Talk.`);
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
      const active = button.dataset.page === page;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
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

  updateWake();
  if (window.location.hash.replace("#", "") !== page) {
    window.history.replaceState(null, "", `#${page}`);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startTalkSession() {
  if (state.talkStarted) return;
  state.talkStarted = true;
  updateTalkChrome();
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
    card.className = `skill-card${skill.id === state.mode ? " active" : ""}`;
    card.dataset.skill = skill.id;
    card.setAttribute("aria-pressed", String(skill.id === state.mode));
    const tint = skill.color || "#007aff";
    card.innerHTML = `
      <span class="skill-icon" style="--tint:${tint}">${svgIcon(skillIcon(skill.id))}</span>
      <span class="skill-tag" style="color:${tint};background:${hexToSoft(tint)}">${escapeHtml(skill.tag)}</span>
      <strong>${escapeHtml(skill.name)}</strong>
      <p>${escapeHtml(skill.blurb)}</p>
    `;
    card.addEventListener("click", () => startSkillWorkflow(skill));
    els.skillGrid.appendChild(card);
  });
}

function startSkillWorkflow(skill) {
  if (!skill) return;
  setMode(skill.id, false);
  showPage("talk");
  runSkillWorkflow(skill.id);
}

function runSkillWorkflow(skillId) {
  const active = activeUploadItems().filter((item) => item.type !== "brief");
  const csvs = state.memory.filter((item) => item.type === "csv");
  const openReminders = state.reminders.filter((reminder) => !reminder.done);

  switch (skillId) {
    case "companion":
      skillStarter(
        "I'm in natural chat mode. Tell me what's going on, or drop in a file and I'll keep it in context.",
        "Ask me anything"
      );
      break;
    case "research":
      skillStarter(
        "What should I research? Give me the topic and I’ll look for sources, separate what’s known from what’s fuzzy, and keep the answer tight.",
        "Research "
      );
      break;
    case "digest":
      if (state.memory.length > 1 || openReminders.length) {
        handlePrompt("Give me my daily briefing from my memory, uploads, and open reminders.");
      } else {
        skillStarter(
          "I can brief you once I have something to work from. Add notes, upload a file, or create a reminder and I’ll turn it into a concise rundown.",
          "Give me a briefing"
        );
      }
      break;
    case "pitch":
      skillStarter(
        "Let's build a pitch. Tell me the idea, who it's for, and what you want them to do. I'll turn it into a sharper spoken pitch and help you rehearse it.",
        "Pitch this idea: "
      );
      break;
    case "analyst":
      if (csvs.length || active.length) {
        handlePrompt("Analyze my active uploads and data. Call out the patterns, anomalies, missing pieces, and what I should do next.");
      } else {
        skillStarter(
          "Upload a CSV, screenshot, or notes and I'll analyze it. I can summarize columns, trends, anomalies, and action items.",
          "Analyze this data"
        );
        if (els.quickFileUpload) els.quickFileUpload.click();
      }
      break;
    case "coach":
      skillStarter(
        "Let's practice. Say or type what you plan to say in the meeting, pitch, or interview. I'll coach clarity, confidence, pacing, and give you a stronger version.",
        "Coach me on this: "
      );
      break;
    default:
      skillStarter("I'm ready. What should we work on?", "");
      break;
  }
}

function skillStarter(message, draft) {
  addMessage("agent", message);
  pushHistory("assistant", message);
  if (els.promptInput) {
    els.promptInput.value = draft || "";
    els.promptInput.placeholder = draft || "Message";
    els.promptInput.focus();
    if (draft) els.promptInput.setSelectionRange(els.promptInput.value.length, els.promptInput.value.length);
  }
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
    button.innerHTML = `
      <span class="voice-avatar">${escapeHtml(persona.name.slice(0, 1))}</span>
      <div class="p-text"><strong>${persona.name}</strong><span>${persona.style}</span></div>
    `;
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
    updateLiveSession({ voice: persona.id });
    addMessage("agent", `I'll use ${persona.name} from here.`);
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
  renderSkills();
  renderQuickPrompts();
  updateLiveSession({ instructions: liveSessionHint() });
  if (fromSelect) addActivity("Mode set", `${skill.name} mode is active.`);
}

function updateModeCaption() {
  els.modeCaption.textContent = modeLabel();
}

function renderLanguages() {
  if (!els.langSelect) return;
  els.langSelect.innerHTML = "";
  LANGUAGES.forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang.id;
    option.textContent = lang.name;
    els.langSelect.appendChild(option);
  });
  els.langSelect.value = state.language;
}

function recognitionLanguage() {
  if (!state.language || state.language === "auto") return "en-US";
  const map = {
    en: "en-US",
    fr: "fr-FR",
    de: "de-DE",
    it: "it-IT",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
    ru: "ru-RU",
    tr: "tr-TR",
    vi: "vi-VN",
    id: "id-ID"
  };
  return map[state.language] || state.language;
}

function realtimeTranscriptionConfig() {
  const config = { model: "grok-transcribe" };
  if (state.language && state.language !== "auto") config.language_hint = state.language;
  return config;
}

function renderQuickPrompts() {
  els.quickPrompts.innerHTML = "";
  contextualPrompts().forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => handlePrompt(prompt));
    els.quickPrompts.appendChild(button);
  });
}

function contextualPrompts() {
  const active = activeUploadItems().filter((item) => item.type !== "brief");
  if (active.length) {
    const latest = active[active.length - 1];
    return [
      `Summarize ${latest.name}`,
      "What should I notice in this upload?",
      active.length > 1 ? "Compare these uploads" : "Turn this into action items"
    ];
  }
  const byMode = {
    research: ["Research this with sources", "What changed recently?", "Give me the short version"],
    digest: ["Give me a briefing", "What needs attention?", "List my open reminders"],
    pitch: ["Help me pitch this", "Make it sharper", "Rehearse a client demo"],
    analyst: ["Analyze my data", "Find the trend", "What looks unusual?"],
    coach: ["Practice a meeting", "Give me feedback", "Help me sound clearer"]
  };
  return byMode[state.mode] || SUGGESTED_PROMPTS;
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
  pushHistory("user", cleaned);
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
      let streamed = "";
      const result = await chatAgent(prompt, collectImagesForPrompt(prompt), (delta) => {
        streamed += delta;
        bubble.classList.remove("typing");
        bubble.textContent = stripSpeechTags(streamed);
        els.transcript.scrollTop = els.transcript.scrollHeight;
      });
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

  const spoken = answer || bubble.textContent || answerPrompt(prompt);
  bubble.classList.remove("typing");
  bubble.textContent = stripSpeechTags(spoken);
  if (citations.length) renderCitations(bubble, citations);
  pushHistory("assistant", stripSpeechTags(spoken));
  setExpression(detectExpression(spoken));

  state.streaming = false;
  speak(spoken);
}

// Tool-enabled chat: calls the backend, runs any tools VoiceMate requests
// (remember, reminders, set voice/skill, etc.), then returns the final reply.
async function chatAgent(prompt, images, onDelta) {
  const baseBody = {
    message: prompt,
    persona: getPersona().id,
    mode: state.mode,
    language: state.language,
    history: state.history.slice(0, -1).slice(-10),
    memory: state.memory.map((item) => memoryForChat(item, prompt)),
    reminders: remindersForContext()
  };

  let toolMessages = [];
  let citations = [];
  let finalText = "";

  for (let round = 0; round < 4; round++) {
    const data = await streamChatRound(
      {
        ...baseBody,
        images: round === 0 ? images || [] : [],
        toolMessages
      },
      (delta) => {
        finalText += delta;
        if (onDelta) onDelta(delta);
      }
    );
    if (data.citations && data.citations.length) citations = data.citations;
    const calls = data.toolCalls || [];
    if (!calls.length) {
      return { text: finalText || data.answer || "", citations };
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
      const result = await executeTool(call.function?.name, args);
      toolMessages.push({ role: "tool", tool_call_id: call.id, content: String(result) });
    }
  }

  return { text: finalText || "I tried those actions but didn't finish the answer. Ask me again and I'll keep going.", citations };
}

async function streamChatRound(body, onDelta) {
  const response = await fetch("/api/grok/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Voice request failed");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let citations = [];
  let toolCalls = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";
    for (const frame of frames) {
      const line = frame.split("\n").find((part) => part.startsWith("data:"));
      if (!line) continue;
      const event = safeParse(line.slice(5).trim());
      if (!event) continue;
      if (event.type === "delta" && event.text) {
        answer += event.text;
        if (onDelta) onDelta(event.text);
      } else if (event.type === "citations" && event.citations) {
        citations = event.citations;
      } else if (event.type === "toolCalls" && event.toolCalls) {
        toolCalls = event.toolCalls;
      } else if (event.type === "error") {
        throw new Error(event.error || "stream error");
      }
    }
  }

  return { answer, toolCalls, citations };
}

// Build a context payload that includes a real excerpt of each item's content
// so the model actually understands what the user uploaded, not just a label.
function memoryForContext(item) {
  const excerpt = item.content
    ? String(item.content).replace(/\s+/g, " ").trim().slice(0, item.type === "image" ? 300 : 1400)
    : "";
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    summary: item.summary,
    excerpt,
    active: uploadContextItems().some((ctx) => ctx.id === item.id)
  };
}

function remindersForContext() {
  return state.reminders
    .filter((reminder) => !reminder.done)
    .slice(0, 12)
    .map((reminder, index) => ({
      id: reminder.id,
      name: `Reminder ${index + 1}`,
      type: "reminder",
      summary: formatReminder(reminder),
      excerpt: formatReminder(reminder),
      active: false
    }));
}

// ---------------------------------------------------------------------------
// Tools — what VoiceMate can actually do
// ---------------------------------------------------------------------------

async function executeTool(name, args) {
  args = args || {};
  switch (name) {
    case "get_current_time": {
      return new Date().toLocaleString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    }
    case "calculate": {
      const expr = String(args.expression || "").trim();
      if (!/^[0-9+\-*/().%\s]+$/.test(expr)) return "I can only do basic arithmetic.";
      try {
        const value = Function('"use strict";return (' + expr + ")")();
        if (!Number.isFinite(value)) return "That doesn't work out to a number.";
        return `${expr} is ${Math.round(value * 1e6) / 1e6}`;
      } catch (error) {
        return "I couldn't work that out.";
      }
    }
    case "get_weather": {
      const loc = String(args.location || "").trim();
      if (!loc) return "Which place?";
      try {
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1`
        ).then((r) => r.json());
        const place = geo.results && geo.results[0];
        if (!place) return `I couldn't find ${loc}.`;
        const data = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit`
        ).then((r) => r.json());
        const c = data.current || {};
        toast(`Weather in ${place.name}`);
        return `In ${place.name} it's about ${Math.round(c.temperature_2m)} degrees, ${weatherDesc(c.weather_code)}, feels like ${Math.round(c.apparent_temperature)}.`;
      } catch (error) {
        return "I couldn't get the weather right now.";
      }
    }
    case "open_link": {
      let url = String(args.url || "").trim();
      if (!url) return "No link given.";
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;
      if (!confirm(`Open this link?\n${url}`)) return "The user did not open the link.";
      window.open(url, "_blank", "noopener");
      toast("Opening link");
      return `Opening ${url}.`;
    }
    case "remember_fact": {
      const text = String(args.text || "").trim();
      if (!text) return "Nothing to remember.";
      if (!confirm(`Remember this?\n${text}`)) return "The user chose not to save that memory.";
      state.memory.push({
        id: createMemoryId("note"),
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
      const reminder = createReminder(text, args.due, args.contact);
      state.reminders.push(reminder);
      renderReminders();
      scheduleReminderNotification(reminder);
      toast("Reminder added");
      return `Added a reminder: ${formatReminder(reminder)}.`;
    }
    case "list_reminders": {
      const open = state.reminders.filter((reminder) => !reminder.done);
      return open.length ? open.map((reminder, index) => `${index + 1}. ${formatReminder(reminder)}`).join("; ") : "No reminders right now.";
    }
    case "complete_reminder": {
      const target = findOpenReminder(args.which);
      if (!target) return "Couldn't find that reminder.";
      if (!confirm(`Mark this reminder done?\n${target.text}`)) return "The user left that reminder open.";
      target.done = true;
      renderReminders();
      toast("Reminder completed");
      return `Marked done: ${target.text}.`;
    }
    case "send_reminder": {
      const target = findOpenReminder(args.which);
      if (!target) return "Couldn't find that reminder.";
      return prepareReminderDelivery(target);
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
    send_reminder: "reminder delivery",
    set_voice: "voice settings",
    set_skill: "skill switch",
    get_current_time: "the clock",
    calculate: "the calculator",
    get_weather: "the weather",
    open_link: "your browser"
  };
  return labels[name] || name || "a tool";
}

function weatherDesc(code) {
  const map = {
    0: "clear",
    1: "mostly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "foggy",
    48: "foggy",
    51: "drizzly",
    53: "drizzly",
    55: "drizzly",
    61: "rainy",
    63: "rainy",
    65: "heavy rain",
    71: "snowy",
    73: "snowy",
    75: "heavy snow",
    80: "rain showers",
    81: "rain showers",
    82: "heavy showers",
    95: "stormy",
    96: "stormy",
    99: "stormy"
  };
  return map[code] || "mixed";
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
  const uploadAnswer = answerFromUploadContext(prompt);
  if (uploadAnswer) return uploadAnswer;

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
    const openReminders = state.reminders.filter((reminder) => !reminder.done);
    if (!state.memory.length && !openReminders.length) return "Here's your briefing: nothing in memory yet, so there's not much to report. Add notes, files, or reminders and I'll build a proper rundown.";
    const reminderText = openReminders.length ? `Open reminders: ${openReminders.map(formatReminder).join("; ")}.` : "";
    return `Quick briefing. ${reminderText} ${memoryContext}. That's what I've got so far.`;
  }
  if (containsAny(prompt, ["reminder", "reminders", "tasks", "todo", "to do"])) {
    const openReminders = state.reminders.filter((reminder) => !reminder.done);
    return openReminders.length ? `You have ${openReminders.length} open reminder${openReminders.length === 1 ? "" : "s"}: ${openReminders.map(formatReminder).join("; ")}.` : "No open reminders right now.";
  }
  if (containsAny(prompt, ["research", "look up", "find out", "latest", "sources"])) {
    return "I'd normally research that with live search and cite the sources, but that needs the VoiceMate server running. Start it and ask again.";
  }
  return `Got it. We're in ${modeLabel()} mode. ${memoryContext === "no saved memory yet" ? "Ask me anything, or add a file for sharper answers." : `Here's what I'm keeping in mind: ${memoryContext}.`}`;
}

function answerFromUploadContext(prompt) {
  if (!promptRefersToUploads(prompt)) return "";
  const items = activeUploadItems().filter((item) => item.type !== "brief");
  if (!items.length) return "";
  const parts = items.slice(0, 4).map((item) => {
    if (item.type === "image") {
      return `${item.name}: ${item.summary} I can use the natural vision model for actual image details when the server is connected.`;
    }
    if (item.type === "csv") {
      return `${item.name}: ${item.summary} ${item.insights || ""}`;
    }
    return `${item.name}: ${item.summary} Excerpt: ${liveMemoryExcerpt(item).slice(0, 320)}`;
  });
  return `I'm using the latest upload as context. ${parts.join(" ")}`;
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
          language: state.language === "auto" ? "en" : state.language,
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

function shareMemoryWithLive(items, options = {}) {
  const live = state.live;
  if (!live || !live.ws || live.ws.readyState !== WebSocket.OPEN) return;
  if (!live.sharedMemoryIds) live.sharedMemoryIds = new Set();
  const selected = items.filter((item) => item && item.id && !live.sharedMemoryIds.has(item.id)).slice(0, 4);
  if (!selected.length) return;

  for (const item of selected) {
    live.sharedMemoryIds.add(item.id);
    const summary = [item.name, item.summary].filter(Boolean).join(". ");
    if (item.type === "image" && item.preview) {
      live.ws.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              { type: "input_text", text: `Uploaded image context: ${summary}. Use this image when I ask about it.` },
              { type: "input_image", image_url: item.preview }
            ]
          }
        })
      );
    } else {
      live.ws.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Uploaded file context: ${summary}. Excerpt: ${liveMemoryExcerpt(item)}`
              }
            ]
          }
        })
      );
    }
  }
  addActivity("Shared context", "Uploaded context is available in the live call.");
  if (options.respond) live.ws.send(JSON.stringify({ type: "response.create" }));
}

function updateLiveSession(patch) {
  const live = state.live;
  if (!live || !live.ws || live.ws.readyState !== WebSocket.OPEN) return;
  const session = { ...patch };
  if (session.instructions) {
    session.instructions = `${session.instructions}\n\nActive reminders:\n${remindersForContext().map((r) => r.summary).join("\n") || "none"}`;
  }
  live.ws.send(JSON.stringify({ type: "session.update", session }));
}

function liveSessionHint() {
  const lang = state.language === "auto" ? "the user's language" : LANGUAGES.find((item) => item.id === state.language)?.name || state.language;
  return `Continue as VoiceMate in ${modeLabel()} mode. Reply in ${lang}. Use active uploads, memory, and reminders already present in the conversation.`;
}

function liveMemoryExcerpt(item) {
  return String(item.content || item.insights || item.summary || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1600);
}

async function startLiveCall() {
  if (state.live) return;
  if (!state.backendOnline) {
    addMessage(
      "system",
      "The live voice needs the VoiceMate server. Start it with npm start, open localhost, and tap Start live call again."
    );
    addActivity("Live voice unavailable", "Voice server not connected.");
    showPage("settings");
    return;
  }

  showPage("talk");
  stopWake();
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
    lastUserBubble: null,
    lastUserFinalAt: 0,
    curAsst: null,
    curAsstText: "",
    asstRevealQueue: [],
    asstRevealTimer: null,
    asstFullText: "",
    sharedMemoryIds: new Set()
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
        language: state.language,
        memory: state.memory.map(memoryForContext),
        reminders: remindersForContext()
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
                transcription: realtimeTranscriptionConfig()
              },
              output: { format: { type: "audio/pcm", rate: live.rate } }
            }
          }
        })
      );
      startMicStreaming(live);
      shareMemoryWithLive(activeUploadItems());
      setLiveButton(true, "End call");
      setSpeechStatus("Live", true, false);
      if (els.backendStatus) els.backendStatus.textContent = "Live voice";
      if (els.voiceHint) els.voiceHint.textContent = "Listening, just talk";
      addActivity("Call connected", `Live with the ${getPersona().name} voice.`);
      addMessage("system", "Live call started. Just talk.");
    });

    ws.addEventListener("message", (event) => handleRealtimeMessage(live, event.data));
    ws.addEventListener("error", () => {
      if (state.live === live) endLiveCall("The live connection hit an error.");
    });
    ws.addEventListener("close", () => {
      if (state.live === live) endLiveCall("The call disconnected.");
    });
  } catch (error) {
    addMessage("system", `Couldn't start the call: ${error.message || "unknown error"}.`);
    addActivity("Live call failed", error.message || "Unknown error.");
    endLiveCall();
  }
}

async function startMicStreaming(live) {
  const ctx = live.ctx;
  live.source = ctx.createMediaStreamSource(live.stream);

  // Analysers drive the audio-reactive orb.
  live.inAnalyser = ctx.createAnalyser();
  live.inAnalyser.fftSize = 256;
  live.source.connect(live.inAnalyser);
  live.outAnalyser = ctx.createAnalyser();
  live.outAnalyser.fftSize = 256;
  startOrbReaction(live);

  if (ctx.audioWorklet) {
    try {
      const workletUrl = URL.createObjectURL(
        new Blob(
          [
            `class VoiceMateMicProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this.buffer = new Float32Array(4096);
                this.offset = 0;
              }
              process(inputs) {
                const input = inputs[0] && inputs[0][0];
                if (input) {
                  for (let i = 0; i < input.length; i++) {
                    this.buffer[this.offset++] = input[i];
                    if (this.offset >= this.buffer.length) {
                      this.port.postMessage(this.buffer.slice(0));
                      this.offset = 0;
                    }
                  }
                }
                return true;
              }
            }
            registerProcessor("voicemate-mic", VoiceMateMicProcessor);`
          ],
          { type: "text/javascript" }
        )
      );
      await ctx.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);
      live.worklet = new AudioWorkletNode(ctx, "voicemate-mic");
      live.worklet.port.onmessage = (event) => {
        sendLiveAudioFrame(live, event.data);
      };
      live.source.connect(live.worklet);
      live.worklet.connect(ctx.destination);
      addActivity("Mic capture", "Using AudioWorklet for live voice.");
      return;
    } catch (error) {
      addActivity("Mic fallback", "AudioWorklet unavailable, using compatibility capture.");
    }
  }

  live.processor = ctx.createScriptProcessor(4096, 1, 1);
  live.source.connect(live.processor);
  live.processor.connect(ctx.destination);
  live.processor.onaudioprocess = (event) => {
    sendLiveAudioFrame(live, event.inputBuffer.getChannelData(0));
  };
}

function sendLiveAudioFrame(live, input) {
    if (!live.ws || live.ws.readyState !== WebSocket.OPEN) return;
    const b64 = float32ToBase64PCM16(input);
    live.ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
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
      stopAssistantReveal(live, false);
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
      setLiveText(live.curUser, live.curUserText, true);
      break;
    }

    case "conversation.item.input_audio_transcription.completed": {
      const text = (msg.transcript || live.curUserText || "").trim();
      const duplicateFinal =
        text &&
        normalizeTranscript(text) === normalizeTranscript(live.lastUserFinal) &&
        Date.now() - (live.lastUserFinalAt || 0) < 8000;
      const correctionFinal = !duplicateFinal && shouldReplaceLastUserTranscript(live, text);
      if (live.curUser) {
        live.curUser.classList.remove("live-typing");
        if (duplicateFinal) live.curUser.remove();
        else if (correctionFinal) {
          setLiveText(live.lastUserBubble, text, false);
          replaceLastHistory("user", text);
          live.curUser.remove();
        }
        else if (text) setLiveText(live.curUser, text, false);
        else live.curUser.remove();
      } else if (correctionFinal) {
        setLiveText(live.lastUserBubble, text, false);
        replaceLastHistory("user", text);
      } else if (text && text !== live.lastUserFinal) {
        live.curUser = addMessage("user", "");
        setLiveText(live.curUser, text, true);
      }
      if (text && !duplicateFinal) {
        if (!correctionFinal) pushHistory("user", text);
        live.lastUserFinal = text;
        live.lastUserBubble = correctionFinal ? live.lastUserBubble : live.curUser || live.lastUserBubble;
        live.lastUserFinalAt = Date.now();
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
        live.asstFullText = "";
        live.asstRevealQueue = [];
      }
      live.asstFullText += msg.delta || "";
      enqueueAssistantReveal(live, stripSpeechTags(msg.delta || ""));
      break;
    }

    case "response.output_audio_transcript.done": {
      const finalText = stripSpeechTags(msg.transcript || live.asstFullText || "");
      if (finalText && live.curAsst) {
        const revealed = live.curAsst.dataset.liveText || "";
        if (!live.asstRevealQueue.length && finalText.length > revealed.length && finalText.startsWith(revealed)) {
          enqueueAssistantReveal(live, finalText.slice(revealed.length));
        } else if (!revealed && !live.asstRevealQueue.length) {
          enqueueAssistantReveal(live, finalText);
        }
      }
      if (live.curAsst) {
        live.curAsst.classList.remove("typing");
        if (finalText) live.curAsst.dataset.finalText = finalText;
        else live.curAsst.remove();
      } else if (finalText) {
        live.curAsst = addMessage("agent", "");
        enqueueAssistantReveal(live, finalText);
      }
      if (finalText) {
        pushHistory("assistant", finalText);
        setExpression(detectExpression(finalText));
      }
      const doneBubble = live.curAsst;
      live.lastAsstBubble = doneBubble;
      window.setTimeout(() => {
        if (doneBubble && doneBubble.dataset.finalText && (doneBubble.dataset.liveText || "") !== doneBubble.dataset.finalText) {
          setLiveText(doneBubble, doneBubble.dataset.finalText, false);
        }
      }, 1200);
      live.curAsst = null;
      live.curAsstText = "";
      live.asstFullText = "";
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
      Promise.resolve(executeTool(msg.name, args)).then((result) => {
        if (live.ws && live.ws.readyState === WebSocket.OPEN) {
          live.ws.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: { type: "function_call_output", call_id: msg.call_id, output: String(result) }
            })
          );
          live.ws.send(JSON.stringify({ type: "response.create" }));
        }
      });
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
    setLiveButton(false, "Start live call");
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
    if (live.worklet) {
      live.worklet.port.onmessage = null;
      live.worklet.disconnect();
    }
    if (live.source) live.source.disconnect();
    if (live.stream) live.stream.getTracks().forEach((track) => track.stop());
    stopLivePlayback(live);
    stopAssistantReveal(live, true);
    if (live.ws && live.ws.readyState <= WebSocket.OPEN) live.ws.close();
    if (live.ctx && live.ctx.state !== "closed") live.ctx.close();
  } catch (error) {
    // ignore teardown errors
  }

  setLiveButton(false, "Start live call");
  setSpeechStatus("Ready", false, false);
  updateGrokStatus();
  updateWake();
  if (note) {
    addActivity("Call ended", note);
    addMessage("system", note);
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

function enqueueAssistantReveal(live, text) {
  if (!live || !live.curAsst || !text) return;
  const parts = String(text).match(/\s+|[^\s]+/g) || [];
  live.asstRevealQueue.push(...parts);
  if (live.asstRevealTimer) return;
  const tick = () => {
    if (state.live !== live && !live.curAsst) {
      stopAssistantReveal(live, false);
      return;
    }
    const bubble = live.curAsst || live.lastAsstBubble;
    if (!bubble || !live.asstRevealQueue.length) {
      live.asstRevealTimer = null;
      return;
    }
    let chunk = "";
    let words = 0;
    while (live.asstRevealQueue.length && words < 1) {
      const part = live.asstRevealQueue.shift();
      chunk += part;
      if (!/^\s+$/.test(part)) words += 1;
    }
    appendAnimatedText(bubble, chunk);
    bubble.dataset.liveText = (bubble.dataset.liveText || "") + chunk;
    els.transcript.scrollTop = els.transcript.scrollHeight;
    live.asstRevealTimer = window.setTimeout(tick, chunk.length > 14 ? 150 : 120);
  };
  live.asstRevealTimer = window.setTimeout(tick, 35);
}

function stopAssistantReveal(live, flush) {
  if (!live) return;
  if (live.asstRevealTimer) {
    clearTimeout(live.asstRevealTimer);
    live.asstRevealTimer = null;
  }
  if (flush && live.curAsst && live.asstRevealQueue?.length) {
    const rest = live.asstRevealQueue.join("");
    appendAnimatedText(live.curAsst, rest);
    live.curAsst.dataset.liveText = (live.curAsst.dataset.liveText || "") + rest;
  }
  live.asstRevealQueue = [];
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
  state.recognition.lang = recognitionLanguage();
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
  const normalized = String(label || "").toLowerCase();
  els.speechStatus.className = "status-pill";
  if (speaking) els.speechStatus.classList.add("speaking");
  else if (listening || normalized === "live") els.speechStatus.classList.add("live");
  else if (normalized.includes("thinking") || normalized.includes("connecting")) els.speechStatus.classList.add("thinking");
  else if (normalized.includes("error") || normalized.includes("issue")) els.speechStatus.classList.add("error");
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
  [els.voiceOrb, els.heroOrb].forEach((orb) => {
    if (!orb) return;
    orb.setAttribute("tabindex", "0");
    orb.setAttribute("role", "button");
    orb.setAttribute("aria-label", "Make VoiceMate react");
    orb.addEventListener("click", () => playOrbHappy(orb));
    orb.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playOrbHappy(orb);
      }
    });
  });
  window.addEventListener("mousemove", (event) => {
    eyes.mouseX = event.clientX;
    eyes.mouseY = event.clientY;
    eyes.mouseTs = performance.now();
  });
  scheduleBlink();
  requestAnimationFrame(eyeLoop);
}

function playOrbHappy(orb) {
  if (!orb) return;
  setExpression("happy");
  orb.classList.remove("orb-happy-pop");
  // Force a reflow so repeated taps restart the animation.
  void orb.offsetWidth;
  orb.classList.add("orb-happy-pop");
  window.setTimeout(() => orb.classList.remove("orb-happy-pop"), 760);
  if (!state.live) {
    setEyeMode("idle");
  }
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
  const rotTarget = eyes.expr === "curious" ? 7 : 0;
  eyes.rot = (eyes.rot || 0) + (rotTarget - (eyes.rot || 0)) * 0.15;
  const transform = `translate(${(eyes.gx * 8).toFixed(2)}%, ${(eyes.gy * 6).toFixed(2)}%) rotate(${eyes.rot.toFixed(2)}deg)`;
  for (const el of eyes.els) el.style.transform = transform;
  updateOrbTurn();

  requestAnimationFrame(eyeLoop);
}

function updateOrbTurn() {
  const tiltY = eyes.gx * 15;
  const tiltX = eyes.gy * -11;
  const glintX = eyes.gx * -12;
  const glintY = eyes.gy * -8;
  const fluidX = eyes.gx * 10;
  const fluidY = eyes.gy * 8;
  const glintRot = eyes.gx * -5;
  const fluidRot = eyes.gx * 8;
  for (const orb of [els.voiceOrb, els.heroOrb]) {
    if (!orb) continue;
    orb.style.setProperty("--orb-tilt-x", `${tiltX.toFixed(2)}deg`);
    orb.style.setProperty("--orb-tilt-y", `${tiltY.toFixed(2)}deg`);
    orb.style.setProperty("--orb-glint-x", `${glintX.toFixed(2)}px`);
    orb.style.setProperty("--orb-glint-y", `${glintY.toFixed(2)}px`);
    orb.style.setProperty("--orb-glint-rot", `${glintRot.toFixed(2)}deg`);
    orb.style.setProperty("--orb-fluid-x", `${fluidX.toFixed(2)}px`);
    orb.style.setProperty("--orb-fluid-y", `${fluidY.toFixed(2)}px`);
    orb.style.setProperty("--orb-fluid-rot", `${fluidRot.toFixed(2)}deg`);
  }
}

function shouldReplaceLastUserTranscript(live, text) {
  if (!live || !text || !live.lastUserFinal || !live.lastUserBubble) return false;
  if (Date.now() - (live.lastUserFinalAt || 0) > 8000) return false;
  const current = normalizeTranscript(text);
  const previous = normalizeTranscript(live.lastUserFinal);
  if (!current || !previous || current === previous) return false;
  if (current.startsWith(previous) || previous.startsWith(current)) return true;
  const curWords = current.split(" ");
  const prevWords = previous.split(" ");
  const sharedStart = prevWords.slice(0, Math.min(4, prevWords.length)).join(" ");
  return sharedStart.length > 5 && current.startsWith(sharedStart) && Math.abs(curWords.length - prevWords.length) <= 10;
}

function normalizeTranscript(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  message.textContent = role === "user" || role === "system" ? text : noDashes(text);
  els.transcript.appendChild(message);
  els.transcript.scrollTop = els.transcript.scrollHeight;
  updateTalkChrome();
  return message;
}

function setLiveText(message, text, animateNew = true) {
  if (!message) return;
  const clean = String(text || "");
  const previous = message.dataset.liveText || "";
  if (animateNew && clean.startsWith(previous) && clean.length > previous.length) {
    appendAnimatedText(message, clean.slice(previous.length));
  } else {
    message.innerHTML = wordsToAnimatedHtml(clean, false);
  }
  message.dataset.liveText = clean;
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function appendAnimatedText(message, text) {
  const parts = String(text || "").match(/\s+|[^\s]+/g) || [];
  message.querySelectorAll(".current-word").forEach((node) => node.classList.remove("current-word"));
  let latestWord = null;
  for (const part of parts) {
    if (/^\s+$/.test(part)) {
      message.appendChild(document.createTextNode(part));
    } else {
      const span = document.createElement("span");
      span.className = "word-pop current-word";
      span.textContent = part;
      message.appendChild(span);
      latestWord = span;
    }
  }
  if (latestWord) {
    window.setTimeout(() => latestWord.classList.remove("current-word"), 420);
  }
}

function wordsToAnimatedHtml(text, animate) {
  return (String(text || "").match(/\s+|[^\s]+/g) || [])
    .map((part) => {
      if (/^\s+$/.test(part)) return escapeHtml(part);
      return animate ? `<span class="word-pop">${escapeHtml(part)}</span>` : escapeHtml(part);
    })
    .join("");
}

function updateTalkChrome() {
  if (els.quickPrompts && els.transcript) {
    const hasMessages = Boolean(els.transcript.querySelector(".message"));
    els.quickPrompts.hidden = hasMessages;
  }
  if (els.thinkingDrawer && els.talkTrace && !els.talkTrace.children.length) {
    els.thinkingDrawer.hidden = true;
  }
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
  const noisySettingsTitles = new Set(["Started session", "Started talk session", "Mode set", "Voice engine connected", "Skill selected"]);
  const showInSettings = type !== "system" || !noisySettingsTitles.has(title);
  const item = document.createElement("div");
  item.className = `activity-item trace-${type}`;
  item.innerHTML = `<span></span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></div>`;
  if (els.activityFeed && showInSettings) {
    els.activityFeed.prepend(item.cloneNode(true));
    while (els.activityFeed.children.length > 60) {
      els.activityFeed.removeChild(els.activityFeed.lastChild);
    }
  }
  if (els.talkTrace && type !== "system") {
    if (els.thinkingDrawer) {
      els.thinkingDrawer.hidden = false;
      if (!els.thinkingDrawer.hasAttribute("open")) els.thinkingDrawer.setAttribute("open", "");
    }
    els.talkTrace.prepend(item);
    while (els.talkTrace.children.length > 8) {
      els.talkTrace.removeChild(els.talkTrace.lastChild);
    }
    if (els.thinkingSummary) {
      els.thinkingSummary.textContent = `${title}: ${detail}`;
    }
  }
}

// ---------------------------------------------------------------------------
// Memory + files
// ---------------------------------------------------------------------------

function renderMemory() {
  saveState();
  renderContextChips();
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
      const active = uploadContextItems().some((ctx) => ctx.id === item.id);
      row.className = `memory-item${active ? " active-context" : ""}`;
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
        <div class="mem-actions">
          <span class="mem-tag" style="color:${tint};background:${hexToSoft(tint)}">${active ? "Active" : escapeHtml(memoryLabel(item.type))}</span>
          <button class="mem-use" type="button">${active ? "Using" : "Use"}</button>
          <button class="mem-ask" type="button">Ask</button>
          <button class="mem-delete" type="button" aria-label="Remove ${escapeHtml(item.name)}">${svgIcon("trash")}</button>
        </div>
      `;
      row.querySelector(".mem-use").addEventListener("click", () => activateMemoryItem(item));
      row.querySelector(".mem-ask").addEventListener("click", () => {
        activateMemoryItem(item);
        showPage("talk");
        handlePrompt(`Talk about ${item.name}. What should I know?`);
      });
      row.querySelector(".mem-delete").addEventListener("click", () => removeMemory(index));
      els.memoryGrid.appendChild(row);
    });
}

function removeMemory(index) {
  const item = state.memory[index];
  if (!confirm(`Remove ${item ? item.name : "this item"} from memory?`)) return;
  state.memory.splice(index, 1);
  if (item?.id) removeFromActiveContext(item.id);
  renderMemory();
  addActivity("Removed", `${item ? item.name : "Item"} removed from memory.`);
}

function saveManualContext() {
  const content = els.manualContext.value.trim();
  if (!content) {
    addActivity("Memory not saved", "Paste text first.");
    return;
  }
  const item = {
    id: createMemoryId("note"),
    type: "note",
    name: `Pasted context ${state.memory.length + 1}`,
    summary: summarizeText(content),
    content,
    createdAt: new Date().toISOString()
  };
  state.memory.push(item);
  els.manualContext.value = "";
  renderMemory();
  noteUploadContext([item]);
  addActivity("Saved memory", "Pasted context was added.");
  addMessage("agent", "Got it, I saved that to memory.");
}

async function handleKnowledgeFiles(files, options = {}) {
  if (!files.length) return [];
  const activate = options.activate !== false;
  const added = [];
  for (const file of files) {
    const extracted = await extractFileText(file);
    const text = extracted.text;
    const lowerName = file.name.toLowerCase();
    const type = lowerName.endsWith(".csv") ? "csv" : lowerName.endsWith(".pdf") || lowerName.endsWith(".doc") || lowerName.endsWith(".docx") ? "document" : "note";
    const item =
      type === "csv"
        ? summarizeCsv(file.name, text)
        : {
            id: createMemoryId("note"),
            type,
            name: file.name,
            summary: extracted.summary || summarizeText(text),
            content: text.slice(0, 20000),
            createdAt: new Date().toISOString()
          };
    if (!item.id) item.id = createMemoryId(memoryPrefix(item.type));
    state.memory.push(item);
    added.push(item);
    addActivity("Read file", `${file.name} was added.`);
  }
  renderMemory();
  if (activate) noteUploadContext(added);
  addMessage("agent", `Added ${files.length} file${files.length === 1 ? "" : "s"} to memory.`);
  return added;
}

async function extractFileText(file) {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const raw = await file.text();
    const readable = raw
      .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const useful = readable.length > 240 ? readable.slice(0, 30000) : "";
    return {
      text: useful || `${file.name} is a PDF (${Math.round(file.size / 1024)} KB). Browser extraction could not read clean text from it yet.`,
      summary: useful
        ? `PDF text extracted locally. ${summarizeText(useful)}`
        : `PDF uploaded, ${(file.size / 1024).toFixed(1)} KB. Full PDF extraction may need a server parser.`
    };
  }
  if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
    return {
      text: `${file.name} is a Word document (${Math.round(file.size / 1024)} KB). Full document text extraction needs a document parser.`,
      summary: `Word document uploaded, ${(file.size / 1024).toFixed(1)} KB.`
    };
  }
  return { text: await file.text(), summary: "" };
}

async function handleImageFiles(files, options = {}) {
  if (!files.length) return [];
  const activate = options.activate !== false;
  const added = [];
  for (const file of files) {
    const rawPreview = await readAsDataUrl(file);
    const preview = await prepareImagePreview(rawPreview);
    const dimensions = await getImageDimensions(preview);
    const summary = `Image, ${(file.size / 1024).toFixed(1)} KB, ${dimensions.width} by ${dimensions.height} pixels.`;
    const item = {
      id: createMemoryId("img"),
      type: "image",
      name: file.name,
      summary,
      preview,
      content: `${file.name} ${summary}`,
      createdAt: new Date().toISOString()
    };
    state.memory.push(item);
    added.push(item);
    addActivity("Read image", `${file.name} was added.`);
  }
  renderMemory();
  if (activate) noteUploadContext(added);
  addMessage("agent", `Added ${files.length} image${files.length === 1 ? "" : "s"} to memory.`);
  added.forEach((item) => enrichImageMemory(item));
  return added;
}

async function enrichImageMemory(item) {
  if (!state.backendOnline || !item?.preview) return;
  try {
    addActivity("Reading image", `${item.name} is being understood.`);
    const response = await fetch("/api/grok/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Describe this image in one concise sentence, then name two useful questions the user might ask about it. No markdown.",
        persona: getPersona().id,
        mode: "analyst",
        language: state.language,
        memory: state.memory.map((memoryItem) => memoryForChat(memoryItem, item.name)),
        reminders: remindersForContext(),
        images: [imageForModel(item)]
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.answer) return;
    item.summary = data.answer.slice(0, 280);
    item.content = `${item.name}. ${item.summary}`;
    item.understoodAt = new Date().toISOString();
    renderMemory();
    renderContextChips();
    addActivity("Image understood", item.summary);
  } catch (error) {
    // Vision enrichment is best effort; uploaded image metadata still works.
  }
}

// ---------------------------------------------------------------------------
// Backend status
// ---------------------------------------------------------------------------

function updateGrokStatus() {
  if (state.backendOnline) {
    els.grokStatus.textContent = "Connected. Natural live voice is ready.";
    els.backendStatus.textContent = "VoiceMate voice";
    els.backendStatus.classList.add("connected");
    if (els.voiceHint) els.voiceHint.textContent = "Tap Start live call to talk out loud";
    if (!state.live) setLiveButton(false, "Start live call");
    return;
  }
  els.backendStatus.textContent = "Browser voice";
  els.backendStatus.classList.remove("connected");
  els.grokStatus.textContent = "Offline. Run the VoiceMate server to unlock the natural live voice.";
  if (els.voiceHint) els.voiceHint.textContent = "Browser preview. Set up the server for live voice";
  if (!state.live) setLiveButton(false, "Set up live voice");
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
  renderHomeDashboard();
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
  if (type === "document") return "doc";
  if (type === "conversation") return "chat";
  if (type === "reminder") return "check";
  return "sparkles";
}

function memoryLabel(type) {
  if (type === "csv") return "Data";
  if (type === "image") return "Photo";
  if (type === "note") return "Note";
  if (type === "document") return "Document";
  if (type === "brief") return "Brief";
  if (type === "conversation") return "Chat";
  if (type === "reminder") return "Reminder";
  return type;
}

function memoryTint(type) {
  const tints = { csv: "#34c759", image: "#0a84ff", note: "#ff9f0a", document: "#0a84ff", brief: "#5e5ce6", conversation: "#30b0c7", reminder: "#ff2d55" };
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
    id: createMemoryId("csv"),
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

function prepareImagePreview(src, maxSide = 1400) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
      if (scale >= 1) {
        resolve(src);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => resolve(src);
    image.src = src;
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
    '<circle cx="12" cy="12" r="3"/><path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/>',
  camera:
    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5l1.7-2.5h7.6L17.5 6H21a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.6"/>',
  history:
    '<path d="M3 3v5h5"/><path d="M3.05 13a9 9 0 1 0 2.6-6.4L3 8"/><path d="M12 7v5l3.5 2"/>'
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
    if (data.language && LANGUAGES.find((lang) => lang.id === data.language)) state.language = data.language;
    if (Array.isArray(data.conversations)) state.conversations = data.conversations;
    if (data.uploadContext && Array.isArray(data.uploadContext.ids)) state.uploadContext = data.uploadContext;
    if (typeof data.wakeEnabled === "boolean") state.wakeEnabled = data.wakeEnabled;
  } catch (error) {
    // ignore storage errors
  }
}

function saveState() {
  cacheMemoryAssets();
  const payload = statePayload(state.memory);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(payload));
  } catch (error) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(statePayload(stripLargeAssets(state.memory))));
      toast("Saved memory metadata. Large previews are cached separately.");
    } catch (innerError) {
      toast("Storage is full. Export memory or remove large uploads.");
    }
  }
}

function statePayload(memory) {
  return {
    memory,
    reminders: state.reminders,
    persona: state.persona,
    mode: state.mode,
    language: state.language,
    uploadContext: state.uploadContext,
    wakeEnabled: state.wakeEnabled,
    conversations: state.conversations.slice(0, 40)
  };
}

function stripLargeAssets(memory) {
  return memory.map((item) => {
    if (!item.preview || String(item.preview).length < 200000) return item;
    return { ...item, preview: "", previewStored: true };
  });
}

function openAssetDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(ASSET_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(ASSET_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putAsset(key, value) {
  try {
    const db = await openAssetDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, "readwrite");
      tx.objectStore(ASSET_STORE).put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    // IndexedDB is a best effort cache.
  }
}

async function getAsset(key) {
  try {
    const db = await openAssetDb();
    const value = await new Promise((resolve, reject) => {
      const tx = db.transaction(ASSET_STORE, "readonly");
      const req = tx.objectStore(ASSET_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value || "";
  } catch (error) {
    return "";
  }
}

function cacheMemoryAssets() {
  state.memory.forEach((item) => {
    if (item.id && item.preview && String(item.preview).length > 50000) {
      item.previewStored = true;
      putAsset(`preview:${item.id}`, item.preview);
    }
  });
}

async function restoreMemoryAssets() {
  let changed = false;
  for (const item of state.memory) {
    if (item.previewStored && !item.preview && item.id) {
      const preview = await getAsset(`preview:${item.id}`);
      if (preview) {
        item.preview = preview;
        changed = true;
      }
    }
  }
  if (changed) saveState();
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
    const memoryCount = Array.isArray(data.memory) ? data.memory.length : 0;
    const reminderCount = Array.isArray(data.reminders) ? data.reminders.length : 0;
    if (!confirm(`Import ${memoryCount} memory item${memoryCount === 1 ? "" : "s"} and ${reminderCount} reminder${reminderCount === 1 ? "" : "s"}?`)) {
      return;
    }
    if (Array.isArray(data.memory)) state.memory = state.memory.concat(data.memory);
    if (Array.isArray(data.reminders)) state.reminders = state.reminders.concat(data.reminders);
    ensureMemoryIds();
    renderMemory();
    renderReminders();
    toast("Imported memory");
  } catch (error) {
    toast("Couldn't read that file");
  }
}

// ---------------------------------------------------------------------------
// Saved conversations
// ---------------------------------------------------------------------------

function ensureConversation() {
  if (!state.currentConvo) {
    state.currentConvo = {
      id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
      title: "New conversation",
      titled: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    state.conversations.unshift(state.currentConvo);
  }
  return state.currentConvo;
}

function pushHistory(role, content) {
  state.history.push({ role, content });
  const convo = ensureConversation();
  convo.messages.push({ role, content });
  convo.updatedAt = Date.now();
  if (role === "user" && !convo.titled) {
    convo.title = truncate(content, 46);
    convo.titled = true;
  }
  maybeSummarizeConversation(convo);
  saveState();
}

function replaceLastHistory(role, content) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (state.history[i].role === role) {
      state.history[i].content = content;
      break;
    }
  }
  if (state.currentConvo) {
    for (let i = state.currentConvo.messages.length - 1; i >= 0; i--) {
      if (state.currentConvo.messages[i].role === role) {
        state.currentConvo.messages[i].content = content;
        state.currentConvo.updatedAt = Date.now();
        break;
      }
    }
  }
  saveState();
}

function maybeSummarizeConversation(convo) {
  if (!convo || convo.messages.length < 10 || convo.messages.length % 8 !== 0) return;
  const recent = convo.messages.slice(-8).map((m) => `${m.role}: ${m.content}`).join(" ");
  const summary = summarizeText(recent);
  const existing = state.memory.find((item) => item.type === "conversation" && item.conversationId === convo.id);
  if (existing) {
    existing.summary = summary;
    existing.content = recent.slice(0, 6000);
    existing.updatedAt = new Date().toISOString();
  } else {
    state.memory.push({
      id: createMemoryId("convo"),
      type: "conversation",
      conversationId: convo.id,
      name: `Conversation summary: ${convo.title}`,
      summary,
      content: recent.slice(0, 6000),
      createdAt: new Date().toISOString()
    });
  }
}

function newConversation() {
  if (state.currentConvo && !state.currentConvo.titled) {
    state.conversations = state.conversations.filter((c) => c.id !== state.currentConvo.id);
  }
  state.currentConvo = null;
  state.history = [];
  saveState();
}

function resumeConversation(id) {
  const convo = state.conversations.find((c) => c.id === id);
  if (!convo) return;
  if (state.currentConvo && !state.currentConvo.titled && state.currentConvo.id !== id) {
    state.conversations = state.conversations.filter((c) => c.id !== state.currentConvo.id);
  }
  state.currentConvo = convo;
  state.history = convo.messages.map((m) => ({ role: m.role, content: m.content }));
  els.transcript.innerHTML = "";
  convo.messages.forEach((m) => addMessage(m.role === "user" ? "user" : "agent", m.content));
  state.talkStarted = true;
  closeHistory();
  showPage("talk");
  toast("Resumed conversation");
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter((c) => c.id !== id);
  if (state.currentConvo && state.currentConvo.id === id) {
    state.currentConvo = null;
    state.history = [];
  }
  saveState();
  renderConversations(els.historySearch ? els.historySearch.value : "");
}

function openHistory() {
  renderConversations("");
  if (els.historyModal) {
    state.lastFocus = document.activeElement;
    els.historyModal.hidden = false;
    if (els.historySearch) {
      els.historySearch.value = "";
      els.historySearch.focus();
    }
  }
}

function closeHistory() {
  if (els.historyModal) els.historyModal.hidden = true;
  if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
}

function renderConversations(filter) {
  if (!els.historyList) return;
  const q = (filter || "").toLowerCase();
  const list = state.conversations
    .filter((c) => c.titled)
    .filter((c) => {
      if (!q) return true;
      const hay = (c.title + " " + c.messages.map((m) => m.content).join(" ")).toLowerCase();
      return hay.includes(q);
    });
  els.historyList.innerHTML = "";
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "reminder-empty";
    empty.textContent = q ? "No matches." : "No saved conversations yet.";
    els.historyList.appendChild(empty);
    return;
  }
  list.forEach((c) => {
    const last = c.messages[c.messages.length - 1];
    const row = document.createElement("div");
    row.className = "convo-item";
    row.innerHTML = `
      <button class="convo-open" type="button">
        <strong>${escapeHtml(c.title)}</strong>
        <span>${escapeHtml(noDashes(last ? last.content : "").slice(0, 72))}</span>
      </button>
      <button class="convo-del" type="button" aria-label="Delete conversation">${svgIcon("trash")}</button>
    `;
    row.querySelector(".convo-open").addEventListener("click", () => resumeConversation(c.id));
    row.querySelector(".convo-del").addEventListener("click", () => deleteConversation(c.id));
    els.historyList.appendChild(row);
  });
}

// ---------------------------------------------------------------------------
// Document Q&A: retrieve the most relevant excerpt for the question
// ---------------------------------------------------------------------------

function relevantExcerpt(content, query, max = 900) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > 320) {
      if (cur) chunks.push(cur.trim());
      cur = s;
    } else {
      cur += s;
    }
  }
  if (cur) chunks.push(cur.trim());
  const qWords = new Set(query.toLowerCase().match(/[a-z0-9]{3,}/g) || []);
  const scored = chunks.map((ch) => {
    const hay = ch.toLowerCase();
    let score = 0;
    qWords.forEach((w) => {
      if (hay.includes(w)) score++;
    });
    return { ch, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 4).filter((s, i) => s.score > 0 || i < 1);
  let out = "";
  for (const s of top) {
    if ((out + s.ch).length > max) break;
    out += s.ch + " ";
  }
  return out.trim() || text.slice(0, max);
}

function memoryForChat(item, query) {
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    summary: item.summary,
    excerpt: item.content ? relevantExcerpt(item.content, query, item.type === "image" ? 300 : 1200) : "",
    active: uploadContextItems().some((ctx) => ctx.id === item.id)
  };
}

// ---------------------------------------------------------------------------
// Orb expressions: smile on upbeat, tilt on a question
// ---------------------------------------------------------------------------

let exprTimer = null;

function detectExpression(text) {
  const t = String(text || "");
  if (/[!]|\b(great|awesome|nice|love|glad|happy|congrats|amazing|perfect|yay|excited|wonderful|haha)\b/i.test(t)) {
    return "happy";
  }
  if (t.trim().endsWith("?")) return "curious";
  return null;
}

function setExpression(type) {
  clearTimeout(exprTimer);
  eyes.expr = type;
  eyes.els.forEach((el) => el.classList.toggle("happy", type === "happy"));
  if (type) {
    exprTimer = setTimeout(() => {
      eyes.expr = null;
      eyes.els.forEach((el) => el.classList.remove("happy"));
    }, 2600);
  }
}

// ---------------------------------------------------------------------------
// Wake phrase ("Hey VoiceMate") — optional, listens only on the Talk page
// ---------------------------------------------------------------------------

function updateWake() {
  const onTalk = document.body.classList.contains("talk-session");
  if (state.wakeEnabled && onTalk && !state.live) startWake();
  else stopWake();
}

function startWake() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition || state.wakeRec || state.live || !state.wakeEnabled) return;
  try {
    const rec = new Recognition();
    rec.lang = recognitionLanguage();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .toLowerCase();
      if (/hey,?\s*voice\s*mate|hey,?\s*voicemate/.test(text)) {
        stopWake();
        startLiveCall();
      }
    };
    rec.onend = () => {
      state.wakeRec = null;
      updateWake();
    };
    rec.onerror = () => {};
    state.wakeRec = rec;
    rec.start();
  } catch (error) {
    state.wakeRec = null;
  }
}

function stopWake() {
  if (state.wakeRec) {
    try {
      state.wakeRec.onend = null;
      state.wakeRec.stop();
    } catch (error) {
      // ignore
    }
    state.wakeRec = null;
  }
}

// ---------------------------------------------------------------------------
// Camera: show VoiceMate something live
// ---------------------------------------------------------------------------

async function capturePhoto() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    stream.getTracks().forEach((t) => t.stop());
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch (error) {
    return null;
  }
}

async function handleCamera() {
  toast("Opening camera");
  const dataUrl = await capturePhoto();
  if (!dataUrl) {
    addMessage("agent", "I couldn't open the camera. Check the browser permission.");
    return;
  }
  const approved = await confirmCapturedPhoto(dataUrl);
  if (!approved) {
    toast("Photo discarded");
    return;
  }
  const preview = await prepareImagePreview(dataUrl);
  const dimensions = await getImageDimensions(preview);
  const item = {
    id: createMemoryId("img"),
    type: "image",
    name: `Photo ${new Date().toLocaleTimeString()}`,
    summary: `Photo captured during the session, ${dimensions.width} by ${dimensions.height} pixels.`,
    preview,
    content: "A photo the user captured with the camera.",
    createdAt: new Date().toISOString()
  };
  state.memory.push(item);
  renderMemory();
  if (state.live && state.live.ws && state.live.ws.readyState === WebSocket.OPEN) {
    noteUploadContext([item], { respond: true });
    toast("Shared with VoiceMate");
  } else {
    noteUploadContext([item]);
    addMessage("agent", "Got it, I can see the photo. Ask me anything about it.");
  }
}

function confirmCapturedPhoto(dataUrl) {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "camera-preview-modal";
    modal.innerHTML = `
      <div class="camera-preview-card" role="dialog" aria-modal="true" aria-label="Camera preview">
        <img src="${dataUrl}" alt="Camera capture preview" />
        <div>
          <strong>Use this photo?</strong>
          <p>Send it to VoiceMate as active context.</p>
        </div>
        <div class="camera-preview-actions">
          <button class="button secondary" type="button" data-action="retake">Discard</button>
          <button class="button primary" type="button" data-action="use">Use photo</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('[data-action="use"]').focus();
    modal.addEventListener("click", (event) => {
      const action = event.target?.dataset?.action;
      if (!action && event.target !== modal) return;
      modal.remove();
      resolve(action === "use");
    });
  });
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

function createReminder(text, due, contact) {
  const parsedDue = parseDueTime(due || text);
  return {
    id: "r" + Date.now() + Math.random().toString(36).slice(2, 6),
    text: String(text || "").trim(),
    dueText: String(due || "").trim(),
    dueAt: parsedDue ? parsedDue.toISOString() : "",
    contact: String(contact || "").trim(),
    done: false,
    notified: false,
    createdAt: new Date().toISOString()
  };
}

function parseDueTime(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return null;
  const now = new Date();
  const explicit = Date.parse(value);
  if (Number.isFinite(explicit)) return new Date(explicit);

  let base = new Date(now);
  if (/\btomorrow\b/.test(text)) base.setDate(base.getDate() + 1);
  if (/\btonight\b/.test(text)) base.setHours(19, 0, 0, 0);
  const inMatch = text.match(/\bin\s+(\d+)\s*(minute|minutes|hour|hours|day|days)\b/);
  if (inMatch) {
    const n = Number(inMatch[1]);
    const unit = inMatch[2];
    if (unit.startsWith("minute")) base.setMinutes(base.getMinutes() + n);
    else if (unit.startsWith("hour")) base.setHours(base.getHours() + n);
    else base.setDate(base.getDate() + n);
    return base;
  }
  const time = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (time && (text.includes("at ") || /\b(am|pm)\b/.test(text))) {
    let hour = Number(time[1]);
    const minute = Number(time[2] || 0);
    const meridiem = time[3];
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    base.setHours(hour, minute, 0, 0);
    if (base < now && !/\btomorrow\b/.test(text)) base.setDate(base.getDate() + 1);
    return base;
  }
  return null;
}

function formatReminder(reminder) {
  const bits = [reminder.text];
  if (reminder.dueAt) bits.push(`due ${new Date(reminder.dueAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`);
  else if (reminder.dueText) bits.push(`due ${reminder.dueText}`);
  if (reminder.contact) bits.push(`contact ${reminder.contact}`);
  return bits.join(", ");
}

function findOpenReminder(which) {
  const openList = state.reminders.filter((reminder) => !reminder.done);
  const needle = String(which || "").trim().toLowerCase();
  const num = Number(needle);
  let target = Number.isInteger(num) && openList[num - 1] ? openList[num - 1] : null;
  if (!target && needle) target = openList.find((reminder) => reminder.text.toLowerCase().includes(needle));
  return target || null;
}

function prepareReminderDelivery(reminder) {
  const message = encodeURIComponent(`Reminder from VoiceMate: ${formatReminder(reminder)}`);
  const contact = String(reminder.contact || "").trim();
  if (!contact) {
    toast("Add an email or phone first");
    return "That reminder does not have an email or phone number yet.";
  }
  const href = contact.includes("@")
    ? `mailto:${encodeURIComponent(contact)}?subject=${encodeURIComponent("VoiceMate reminder")}&body=${message}`
    : `sms:${encodeURIComponent(contact)}?&body=${message}`;
  window.open(href, "_blank", "noopener");
  toast(contact.includes("@") ? "Opening email" : "Opening text");
  return contact.includes("@") ? "I opened an email draft for that reminder." : "I opened a text draft for that reminder.";
}

function scheduleReminderNotification(reminder) {
  if (!reminder.dueAt || !("Notification" in window)) return;
  const due = new Date(reminder.dueAt).getTime();
  const delay = due - Date.now();
  if (delay <= 0 || delay > 2147483647) return;
  const arm = () => {
    setTimeout(() => {
      if (reminder.done || reminder.notified) return;
      reminder.notified = true;
      saveState();
      new Notification("VoiceMate reminder", { body: reminder.text });
    }, delay);
  };
  if (Notification.permission === "granted") arm();
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") arm();
    });
  }
}

function scheduleAllReminderNotifications() {
  state.reminders.filter((reminder) => !reminder.done && reminder.dueAt).forEach(scheduleReminderNotification);
}

function renderReminders() {
  saveState();
  renderHomeDashboard();
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
        <span><strong>${escapeHtml(reminder.text)}</strong><small>${escapeHtml(formatReminder(reminder).replace(reminder.text, "").replace(/^,\s*/, ""))}</small></span>
        <button class="reminder-send" type="button">${reminder.contact ? "Send" : "Add contact"}</button>
        <button class="reminder-delete" type="button" aria-label="Delete reminder">${svgIcon("trash")}</button>
      `;
      row.querySelector(".reminder-check").addEventListener("click", () => {
        reminder.done = true;
        renderReminders();
        toast("Reminder completed");
      });
      row.querySelector(".reminder-send").addEventListener("click", () => {
        if (!reminder.contact) {
          const contact = prompt("Email or phone number for this reminder?");
          if (!contact) return;
          reminder.contact = contact.trim();
          renderReminders();
        }
        prepareReminderDelivery(reminder);
      });
      row.querySelector(".reminder-delete").addEventListener("click", () => {
        if (!confirm("Delete this reminder?")) return;
        state.reminders = state.reminders.filter((item) => item.id !== reminder.id);
        renderReminders();
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
    toastHost.setAttribute("role", "status");
    toastHost.setAttribute("aria-live", "polite");
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
      if (els.historyModal && !els.historyModal.hidden) {
        closeHistory();
        return;
      }
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
    // Space starts a call (hands-free) when on Talk and not typing.
    if (event.code === "Space" && !typing && !event.repeat && document.body.classList.contains("talk-session")) {
      event.preventDefault();
      if (!state.live) startLiveCall();
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
