const STARTER_MEMORY = [
  {
    type: "brief",
    name: "VoiceMate product brief",
    summary:
      "VoiceMate is a human like voice and text agent that can learn from uploads, create pitches, inspect images, summarize data, and show its work.",
    content:
      "VoiceMate should feel like a polished AI teammate with natural voice, text chat, uploads, memory, pitch support, data summaries, and an Apple style interface.",
    createdAt: new Date().toISOString()
  }
];

const PERSONAS = [
  {
    id: "sol",
    name: "Sol",
    style: "Warm, smooth, confident",
    bestFor: "Everyday conversation and client friendly answers",
    rate: 0.98,
    pitch: 1.02
  },
  {
    id: "nova",
    name: "Nova",
    style: "Bright, sharp, persuasive",
    bestFor: "Pitches, demos, and sales moments",
    rate: 1.04,
    pitch: 1.08
  },
  {
    id: "atlas",
    name: "Atlas",
    style: "Calm, precise, thoughtful",
    bestFor: "Data, planning, and technical explanation",
    rate: 0.94,
    pitch: 0.92
  }
];

const SUGGESTED_PROMPTS = [
  "What are you?",
  "Pitch this to a client",
  "What can you do with files?",
  "Summarize my data",
  "Should we use Grok voice?",
  "What do you remember?"
];

const state = {
  memory: [...STARTER_MEMORY],
  persona: "sol",
  mode: "companion",
  voices: [],
  selectedVoiceURI: "",
  recognition: null,
  recognizing: false,
  grokKeySaved: Boolean(window.sessionStorage.getItem("voicemateGrokKeyNote"))
};

const els = {
  navLinks: document.querySelectorAll(".nav-link"),
  pageLinks: document.querySelectorAll(".page-link"),
  pages: document.querySelectorAll("[data-page-panel]"),
  personaList: document.querySelector("#personaList"),
  systemVoice: document.querySelector("#systemVoice"),
  agentMode: document.querySelector("#agentMode"),
  sampleVoice: document.querySelector("#sampleVoice"),
  activePersonaName: document.querySelector("#activePersonaName"),
  modeCaption: document.querySelector("#modeCaption"),
  speechStatus: document.querySelector("#speechStatus"),
  transcript: document.querySelector("#transcript"),
  promptForm: document.querySelector("#promptForm"),
  promptInput: document.querySelector("#promptInput"),
  micButton: document.querySelector("#micButton"),
  voiceOrb: document.querySelector("#voiceOrb"),
  heroOrb: document.querySelector("#heroOrb"),
  quickPrompts: document.querySelector("#quickPrompts"),
  activityFeed: document.querySelector("#activityFeed"),
  knowledgeUpload: document.querySelector("#knowledgeUpload"),
  imageUpload: document.querySelector("#imageUpload"),
  quickFileUpload: document.querySelector("#quickFileUpload"),
  manualContext: document.querySelector("#manualContext"),
  saveContext: document.querySelector("#saveContext"),
  clearMemory: document.querySelector("#clearMemory"),
  memoryGrid: document.querySelector("#memoryGrid"),
  grokKeyInput: document.querySelector("#grokKeyInput"),
  saveGrokKey: document.querySelector("#saveGrokKey"),
  grokStatus: document.querySelector("#grokStatus")
};

function init() {
  renderPersonas();
  renderQuickPrompts();
  renderMemory();
  updateModeCaption();
  updateGrokStatus();
  setupSpeechRecognition();
  wireEvents();
  loadSystemVoices();

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadSystemVoices;
  }

  addActivity("Started session", "Voice, text, files, images, and memory are ready.");
  addMessage(
    "agent",
    "Hi, I am VoiceMate. Talk to me, type to me, upload files, upload images, or ask me to pitch an idea. I will show what I am doing while I answer."
  );
}

function wireEvents() {
  els.navLinks.forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  els.pageLinks.forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  els.promptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handlePrompt(els.promptInput.value);
  });

  els.micButton.addEventListener("click", () => {
    if (!state.recognition) {
      addMessage("agent", "Voice input is not available in this Chrome session. You can still type and upload files.");
      addActivity("Voice input unavailable", "Chrome did not provide speech input here.");
      return;
    }

    if (state.recognizing) {
      state.recognition.stop();
    } else {
      state.recognition.start();
    }
  });

  els.systemVoice.addEventListener("change", (event) => {
    state.selectedVoiceURI = event.target.value;
    addActivity("Changed voice", event.target.selectedOptions[0]?.textContent || "System voice");
  });

  els.agentMode.addEventListener("change", (event) => {
    state.mode = event.target.value;
    updateModeCaption();
    addActivity("Changed mode", `VoiceMate is now in ${modeLabel()} mode.`);
  });

  els.sampleVoice.addEventListener("click", () => {
    const persona = getPersona();
    speak(`I am ${persona.name}. ${persona.style}. Ask me anything or give me a file.`);
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
    const images = files.filter((file) => file.type.startsWith("image/"));
    const docs = files.filter((file) => !file.type.startsWith("image/"));
    if (docs.length) handleKnowledgeFiles(docs);
    if (images.length) handleImageFiles(images);
    event.target.value = "";
  });

  els.saveContext.addEventListener("click", saveManualContext);

  els.clearMemory.addEventListener("click", () => {
    state.memory = [];
    renderMemory();
    addActivity("Cleared memory", "Session memory is empty.");
    addMessage("agent", "I cleared the memory for this session.");
  });

  els.saveGrokKey.addEventListener("click", () => {
    const value = els.grokKeyInput.value.trim();
    if (!value) {
      addActivity("Grok key note", "No key was entered.");
      els.grokStatus.textContent = "No key note saved.";
      return;
    }

    window.sessionStorage.setItem("voicemateGrokKeyNote", maskKey(value));
    state.grokKeySaved = true;
    els.grokKeyInput.value = "";
    updateGrokStatus();
    addActivity("Saved Grok note", "Stored only a masked local note for this session.");
    addMessage(
      "agent",
      "I saved a local Grok key note for planning. For the real app, the secret key should live on a backend, not inside the website."
    );
  });

  document.addEventListener("dragover", (event) => event.preventDefault());
  document.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = [...event.dataTransfer.files];
    const images = files.filter((file) => file.type.startsWith("image/"));
    const docs = files.filter((file) => !file.type.startsWith("image/"));
    if (docs.length) handleKnowledgeFiles(docs);
    if (images.length) handleImageFiles(images);
    showPage("memory");
  });
}

function showPage(page) {
  els.pages.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.pagePanel === page);
  });

  els.navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  addActivity("Opened page", `${titleCase(page)} page is active.`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderPersonas() {
  els.personaList.innerHTML = "";

  PERSONAS.forEach((persona) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `persona-option${persona.id === state.persona ? " active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(persona.id === state.persona));
    button.innerHTML = `<strong>${persona.name}</strong><span>${persona.style}<br>${persona.bestFor}</span>`;
    button.addEventListener("click", () => {
      state.persona = persona.id;
      renderPersonas();
      updatePersonaLabel();
      addActivity("Changed personality", `${persona.name} is selected.`);
      speak(`I am ${persona.name}. Ready when you are.`);
    });
    els.personaList.appendChild(button);
  });

  updatePersonaLabel();
}

function updatePersonaLabel() {
  els.activePersonaName.textContent = getPersona().name;
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

function renderMemory() {
  els.memoryGrid.innerHTML = "";

  if (!state.memory.length) {
    const empty = document.createElement("div");
    empty.className = "memory-empty";
    empty.textContent = "No memory yet.";
    els.memoryGrid.appendChild(empty);
    return;
  }

  state.memory
    .slice()
    .reverse()
    .forEach((item) => {
      const card = document.createElement("article");
      card.className = `memory-card ${item.type}`;

      const visual = item.preview
        ? `<img src="${item.preview}" alt="${escapeHtml(item.name)} preview" />`
        : `<div class="memory-icon">${memoryIcon(item.type)}</div>`;

      card.innerHTML = `
        ${visual}
        <div>
          <span>${escapeHtml(item.type)}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.summary)}</p>
        </div>
      `;
      els.memoryGrid.appendChild(card);
    });
}

function handlePrompt(prompt) {
  const cleaned = prompt.trim();
  if (!cleaned) return;

  showPage("talk");
  addMessage("user", cleaned);
  els.promptInput.value = "";

  const steps = planSteps(cleaned);
  steps.forEach((step, index) => {
    window.setTimeout(() => addActivity(step.title, step.detail), index * 120);
  });

  window.setTimeout(() => {
    const answer = answerPrompt(cleaned);
    addMessage("agent", answer);
    speak(answer);
  }, Math.max(340, steps.length * 140));
}

function planSteps(prompt) {
  const lower = prompt.toLowerCase();
  const steps = [
    {
      title: "Read request",
      detail: `Mode is ${modeLabel()} with ${getPersona().name}.`
    }
  ];

  if (state.memory.length) {
    steps.push({
      title: "Checked memory",
      detail: `${state.memory.length} item${state.memory.length === 1 ? "" : "s"} available.`
    });
  }

  if (containsAny(lower, ["pitch", "sell", "client", "demo"])) {
    steps.push({ title: "Built pitch angle", detail: "Using problem, promise, proof, and next step." });
  }

  if (containsAny(lower, ["data", "csv", "number", "trend", "summarize"])) {
    steps.push({ title: "Checked data", detail: "Looking for uploaded rows, columns, and numbers." });
  }

  if (containsAny(lower, ["image", "picture", "screenshot", "photo", "look"])) {
    steps.push({ title: "Checked images", detail: "Looking at image details and previews." });
  }

  if (containsAny(lower, ["grok", "xai", "voice model", "api key"])) {
    steps.push({ title: "Checked voice plan", detail: "Comparing local demo voice with production Grok voice." });
  }

  steps.push({ title: "Drafted answer", detail: "Combining your request with session memory." });
  return steps;
}

function answerPrompt(rawPrompt) {
  const prompt = rawPrompt.toLowerCase();
  const persona = getPersona();
  const memoryContext = summarizeMemoryForAnswer();
  const csvs = state.memory.filter((item) => item.type === "csv");
  const images = state.memory.filter((item) => item.type === "image");

  if (containsAny(prompt, ["grok", "xai", "api key", "voice model", "better voice"])) {
    return "Yes, Grok xAI voice is worth testing for the real voice agent. It supports realtime voice, tool use, and simple usage pricing. I would not put the real key inside this static page because anyone could see it. The right setup is a small backend that stores the Grok key, creates a voice session, and lets this page connect safely. For now, this demo uses Chrome voice so it can open as one file.";
  }

  if (containsAny(prompt, ["what are you", "what do you do", "who are you", "voicemate"])) {
    return "I am VoiceMate, a prototype for a human like voice agent. I can talk, type, remember uploads, summarize files, inspect image details, help with pitches, and show what I am doing while I answer.";
  }

  if (containsAny(prompt, ["pitch", "sell", "demo", "client", "persuade"])) {
    return `${persona.name} pitch mode: VoiceMate gives users one calm place to talk, type, upload context, and get useful answers. The value is speed and clarity. Give it your real information and it becomes a pitch partner, analyst, and conversation assistant. Current context: ${memoryContext}`;
  }

  if (containsAny(prompt, ["upload", "file", "files", "memory", "remember", "what did i upload"])) {
    if (!state.memory.length) return "You have not added memory yet. Upload files, images, or paste notes on the Memory page.";
    return `I have ${state.memory.length} memory item${state.memory.length === 1 ? "" : "s"} right now: ${state.memory
      .map((item) => `${item.name} as ${item.type}`)
      .join(", ")}.`;
  }

  if (containsAny(prompt, ["data", "csv", "numbers", "trend", "analyze", "summarize my data"])) {
    if (!csvs.length) {
      return "I do not see a CSV file yet. Upload one on the Memory page and I can summarize rows, columns, averages, ranges, and obvious patterns.";
    }

    return csvs.map((csv) => `${csv.name}: ${csv.summary} ${csv.insights || ""}`).join(" ");
  }

  if (containsAny(prompt, ["image", "picture", "photo", "screenshot", "look at"])) {
    if (!images.length) {
      return "I do not see an image yet. Upload one on the Memory page or with the upload button in Talk mode. This local demo reads image details and previews. The real version should connect to a multimodal model for full image understanding.";
    }

    return images.map((image) => `${image.name}: ${image.summary}`).join(" ");
  }

  if (containsAny(prompt, ["production", "build", "real app", "features", "make it work"])) {
    return "For the real product, I would use Grok xAI or OpenAI for realtime voice, LiveKit for voice sessions, a backend for secret keys, a multimodal model for images, private memory, source based answers, and real tools for search, calendars, CRM, and documents.";
  }

  if (state.mode === "pitch") {
    return `Pitch mode: I would explain the outcome first. VoiceMate helps people talk with their information instead of digging through files. It listens, remembers, summarizes, and turns rough ideas into clear action. Current context: ${memoryContext}`;
  }

  if (state.mode === "analyst") {
    return `Analyst mode: I would separate your notes, files, images, and data, then look for patterns and missing context. Current memory: ${memoryContext}`;
  }

  if (state.mode === "coach") {
    return "Coach mode: Tell me the audience and goal. I can help you sound clearer, more natural, and more persuasive.";
  }

  return `I can help with that. I am using ${modeLabel()} mode and this memory: ${memoryContext}. Add more files or notes if you want a sharper answer.`;
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
  addMessage("agent", "I saved that context to memory.");
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
  addMessage("agent", `I added ${files.length} file${files.length === 1 ? "" : "s"} to memory.`);
}

async function handleImageFiles(files) {
  if (!files.length) return;

  for (const file of files) {
    const preview = await readAsDataUrl(file);
    const dimensions = await getImageDimensions(preview);
    const summary = `Image file, ${(file.size / 1024).toFixed(1)} KB, ${dimensions.width} by ${dimensions.height} pixels.`;

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
  addMessage("agent", `I added ${files.length} image${files.length === 1 ? "" : "s"} to memory.`);
}

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
    addActivity("Voice input issue", "Chrome blocked or skipped speech input.");
  };

  state.recognition.onend = () => {
    state.recognizing = false;
    els.micButton.classList.remove("recording");
    setSpeechStatus("Ready", false);
  };
}

function speak(text) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const selected = state.voices.find((voice) => voice.voiceURI === state.selectedVoiceURI);
  const persona = getPersona();

  if (selected) utterance.voice = selected;
  utterance.rate = persona.rate;
  utterance.pitch = persona.pitch;

  utterance.onstart = () => setSpeechStatus("Speaking", false, true);
  utterance.onend = () => setSpeechStatus("Ready", false, false);
  utterance.onerror = () => setSpeechStatus("Speech off", false, false);

  window.speechSynthesis.speak(utterance);
}

function loadSystemVoices() {
  state.voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  els.systemVoice.innerHTML = "";

  if (!state.voices.length) {
    const option = document.createElement("option");
    option.textContent = "System voice";
    option.value = "";
    els.systemVoice.appendChild(option);
    return;
  }

  const sortedVoices = [
    ...state.voices.filter((voice) => voice.lang.toLowerCase().startsWith("en")),
    ...state.voices.filter((voice) => !voice.lang.toLowerCase().startsWith("en"))
  ];

  sortedVoices.forEach((voice) => {
    const option = document.createElement("option");
    option.value = voice.voiceURI;
    option.textContent = `${voice.name} (${voice.lang})`;
    els.systemVoice.appendChild(option);
  });

  const preferred = sortedVoices.find((voice) => /samantha|ava|alloy|aria|jenny|natural|google us english/i.test(voice.name));
  state.selectedVoiceURI = preferred?.voiceURI || els.systemVoice.value;
  els.systemVoice.value = state.selectedVoiceURI;
}

function setSpeechStatus(label, listening, speaking = false) {
  els.speechStatus.textContent = label;
  [els.voiceOrb, els.heroOrb].forEach((orb) => {
    orb.classList.toggle("listening", listening);
    orb.classList.toggle("speaking", speaking);
  });
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  els.transcript.appendChild(message);
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function addActivity(title, detail) {
  const item = document.createElement("div");
  item.className = "activity-item";
  item.innerHTML = `<span></span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></div>`;
  els.activityFeed.prepend(item);
}

function getPersona() {
  return PERSONAS.find((persona) => persona.id === state.persona) || PERSONAS[0];
}

function modeLabel() {
  const labels = {
    companion: "Natural conversation",
    pitch: "Pitch builder",
    analyst: "Data analyst",
    coach: "Meeting coach"
  };
  return labels[state.mode] || labels.companion;
}

function memoryIcon(type) {
  if (type === "csv") return "CSV";
  if (type === "image") return "IMG";
  if (type === "note") return "TXT";
  return "AI";
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
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "you",
    "your",
    "are",
    "from",
    "into",
    "can",
    "will",
    "have",
    "has",
    "was",
    "our",
    "about"
  ]);
  const counts = new Map();
  text
    .toLowerCase()
    .match(/[a-z0-9][a-z0-9]{2,}/g)
    ?.forEach((word) => {
      if (!stop.has(word)) counts.set(word, (counts.get(word) || 0) + 1);
    });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
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

function updateGrokStatus() {
  const saved = window.sessionStorage.getItem("voicemateGrokKeyNote");
  els.grokStatus.textContent = saved ? `Local key note saved as ${saved}.` : "No key note saved.";
}

function maskKey(value) {
  const clean = value.trim();
  if (clean.length <= 8) return "saved";
  return `${clean.slice(0, 4)} hidden ${clean.slice(-4)}`;
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

init();
