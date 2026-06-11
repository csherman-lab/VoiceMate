const STARTER_MEMORY = [
  {
    type: "brief",
    name: "Auralis product brief",
    summary:
      "Auralis is a human-like voice and text agent that can absorb user-provided information, create pitches, discuss strategy, inspect uploaded images, summarize data, and show visible work.",
    content:
      "Auralis should feel like a polished AI operator: natural voice, ChatGPT-style text, image uploads, data uploads, clear activity logs, pitch support, and an Apple-inspired interface.",
    createdAt: new Date().toISOString()
  }
];

const PERSONAS = [
  {
    id: "sol",
    name: "Sol",
    style: "Warm, smooth, confident",
    bestFor: "Everyday conversation and client-friendly answers",
    rate: 0.98,
    pitch: 1.02
  },
  {
    id: "nova",
    name: "Nova",
    style: "Energetic, sharp, persuasive",
    bestFor: "Pitching, demos, and sales moments",
    rate: 1.04,
    pitch: 1.08
  },
  {
    id: "atlas",
    name: "Atlas",
    style: "Calm, analytical, precise",
    bestFor: "Data, strategy, and technical explanation",
    rate: 0.94,
    pitch: 0.92
  }
];

const SUGGESTED_PROMPTS = [
  "What are you?",
  "Pitch this project to a client",
  "What can you do with uploaded files?",
  "Summarize my data",
  "What did I upload?",
  "How would you make this production-ready?"
];

const state = {
  memory: [...STARTER_MEMORY],
  persona: "sol",
  mode: "companion",
  voices: [],
  selectedVoiceURI: "",
  recognition: null,
  recognizing: false
};

const els = {
  personaList: document.querySelector("#personaList"),
  systemVoice: document.querySelector("#systemVoice"),
  agentMode: document.querySelector("#agentMode"),
  sampleVoice: document.querySelector("#sampleVoice"),
  activePersonaName: document.querySelector("#activePersonaName"),
  speechStatus: document.querySelector("#speechStatus"),
  transcript: document.querySelector("#transcript"),
  promptForm: document.querySelector("#promptForm"),
  promptInput: document.querySelector("#promptInput"),
  micButton: document.querySelector("#micButton"),
  voiceOrb: document.querySelector("#voiceOrb"),
  quickPrompts: document.querySelector("#quickPrompts"),
  activityFeed: document.querySelector("#activityFeed"),
  knowledgeUpload: document.querySelector("#knowledgeUpload"),
  imageUpload: document.querySelector("#imageUpload"),
  manualContext: document.querySelector("#manualContext"),
  saveContext: document.querySelector("#saveContext"),
  memoryGrid: document.querySelector("#memoryGrid")
};

function init() {
  renderPersonas();
  renderQuickPrompts();
  renderMemory();
  setupSpeechRecognition();
  wireEvents();
  loadSystemVoices();

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadSystemVoices;
  }

  addActivity("Booted local session", "Ready to talk, type, and accept uploads.");
  addMessage(
    "agent",
    "Hey, I'm Auralis. You can talk to me, type to me, upload notes, CSVs, or images, and ask me to pitch, summarize, explain, or brainstorm. Everything in this demo runs locally in your browser session."
  );
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
      addActivity("Changed voice personality", `${persona.name}: ${persona.style}.`);
      speak(`I'm ${persona.name}. ${persona.style}. Ready when you are.`);
    });
    els.personaList.appendChild(button);
  });

  updatePersonaLabel();
}

function updatePersonaLabel() {
  els.activePersonaName.textContent = getPersona().name;
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
    empty.textContent = "No uploaded memory yet.";
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
          <span>${item.type}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.summary)}</p>
        </div>
      `;
      els.memoryGrid.appendChild(card);
    });
}

function memoryIcon(type) {
  if (type === "csv") return "CSV";
  if (type === "image") return "IMG";
  if (type === "note") return "TXT";
  return "AI";
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
    companion: "natural conversation",
    pitch: "pitch builder",
    analyst: "data analyst",
    coach: "meeting coach"
  };
  return labels[state.mode] || labels.companion;
}

function handlePrompt(prompt) {
  const cleaned = prompt.trim();
  if (!cleaned) return;

  addMessage("user", cleaned);
  els.promptInput.value = "";

  const steps = planSteps(cleaned);
  steps.forEach((step, index) => {
    window.setTimeout(() => addActivity(step.title, step.detail), index * 130);
  });

  window.setTimeout(() => {
    const answer = answerPrompt(cleaned);
    addMessage("agent", answer);
    speak(answer);
  }, Math.max(360, steps.length * 150));
}

function planSteps(prompt) {
  const lower = prompt.toLowerCase();
  const steps = [
    {
      title: "Read user request",
      detail: `Mode is ${modeLabel()}; voice is ${getPersona().name}.`
    }
  ];

  if (state.memory.length) {
    steps.push({
      title: "Checked session memory",
      detail: `${state.memory.length} memory item${state.memory.length === 1 ? "" : "s"} available.`
    });
  }

  if (containsAny(lower, ["pitch", "sell", "client", "demo"])) {
    steps.push({ title: "Prepared pitch angle", detail: "Looking for audience, pain, promise, proof, and next step." });
  }

  if (containsAny(lower, ["data", "csv", "number", "trend", "summarize"])) {
    steps.push({ title: "Looked for data", detail: "Checking uploaded CSVs and numeric summaries." });
  }

  if (containsAny(lower, ["image", "picture", "screenshot", "photo", "look"])) {
    steps.push({ title: "Looked for images", detail: "Checking uploaded image metadata and previews." });
  }

  steps.push({ title: "Drafted response", detail: "Combining conversation context with uploaded material." });
  return steps;
}

function answerPrompt(rawPrompt) {
  const prompt = rawPrompt.toLowerCase();
  const persona = getPersona();
  const memoryContext = summarizeMemoryForAnswer();
  const pitchContext = findRelevantMemory(["pitch", "company", "product", "offer", "client", "brief"]);
  const csvs = state.memory.filter((item) => item.type === "csv");
  const images = state.memory.filter((item) => item.type === "image");

  if (containsAny(prompt, ["what are you", "what do you do", "who are you", "auralis"])) {
    return `I'm Auralis, a prototype for a human-like voice agent. I can talk out loud, answer by text, remember information you upload in this session, help pitch ideas, summarize CSV or text files, inspect basic image details, and show the steps I'm taking while I work. In production, I would connect to a real multimodal model for deeper voice and vision.`;
  }

  if (containsAny(prompt, ["pitch", "sell", "demo", "client", "persuade"])) {
    const base = pitchContext?.summary || "the information you give me";
    return `${persona.name} pitch mode: Here is the clean version. Auralis gives people one place to speak, type, upload files, and see an AI work through the answer. The hook is simple: instead of a generic chatbot, it behaves like a polished operator that can understand context, explain things clearly, and turn raw information into useful action. For a client, I would lead with the pain, show the live voice/text/upload loop, then close with: give Auralis your real materials and it becomes a pitch assistant, analyst, and conversation partner for your team. Current source: ${base}`;
  }

  if (containsAny(prompt, ["upload", "file", "files", "memory", "what did i give", "what did i upload"])) {
    if (!state.memory.length) return "You have not uploaded anything yet. Add text, markdown, JSON, CSV, images, or paste context in the Knowledge Studio.";
    return `You have ${state.memory.length} memory item${state.memory.length === 1 ? "" : "s"} in this session: ${state.memory
      .map((item) => `${item.name} (${item.type})`)
      .join(", ")}. The latest useful summary is: ${state.memory[state.memory.length - 1].summary}`;
  }

  if (containsAny(prompt, ["data", "csv", "numbers", "trend", "analyze", "summarize my data"])) {
    if (!csvs.length) {
      return "I do not see a CSV uploaded yet. Upload a CSV in the Knowledge Studio and I can summarize rows, columns, numeric ranges, averages, and what the data appears to contain.";
    }

    return csvs
      .map((csv) => `${csv.name}: ${csv.summary}${csv.insights ? ` ${csv.insights}` : ""}`)
      .join(" ");
  }

  if (containsAny(prompt, ["image", "picture", "photo", "screenshot", "look at"])) {
    if (!images.length) {
      return "I do not see an uploaded image yet. Upload one in the Knowledge Studio and I can read file details, dimensions, preview it, and use that context in conversation. Full object-level vision would require connecting a production multimodal model.";
    }

    return images
      .map((image) => `${image.name}: ${image.summary}`)
      .join(" ");
  }

  if (containsAny(prompt, ["production", "build", "real app", "better", "next", "features"])) {
    return "For the real version, I would add realtime voice through LiveKit plus OpenAI or xAI, true image understanding through a multimodal model, persistent private memory, source citations, web/data connectors, calendar/CRM actions, evaluation tests for voice quality, and a deployment flow that works on web and phone. The current version is a local Chrome prototype that proves the interface and interaction model.";
  }

  if (containsAny(prompt, ["open", "chrome", "regular computer", "run"])) {
    return "To open this on your regular computer: download the project folder, keep index.html, styles.css, and app.js together, then double-click index.html in Chrome. You do not need localhost. Text, speech output, and uploads work locally; microphone speech input depends on Chrome permissions.";
  }

  if (state.mode === "pitch") {
    return `Pitch mode answer: I would frame this around outcome, proof, and next step. Outcome: a natural AI voice agent that can understand your materials and talk like a real assistant. Proof: this prototype already supports text, voice output, file memory, image metadata, data summaries, and visible work. Next step: upload the real company or product info and ask me to tailor the pitch.`;
  }

  if (state.mode === "analyst") {
    return `Analyst mode answer: based on the current session, I would first separate uploaded knowledge from uploaded data, then summarize what is known, what is missing, and what decision you are trying to make. Current memory: ${memoryContext}`;
  }

  if (state.mode === "coach") {
    return "Coach mode answer: I would help you sound clearer and more human. Give me the audience, the goal, and what you want them to feel. Then I can turn rough notes into a natural script, objections, follow-up questions, and a closing ask.";
  }

  return `I can help with that. Right now I am using the local session memory and the ${modeLabel()} mode. The most relevant context I have is: ${memoryContext}. If you want me to be more specific, upload notes, a CSV, an image, or paste the exact information you want me to use.`;
}

function summarizeMemoryForAnswer() {
  if (!state.memory.length) return "no uploaded information yet";
  return state.memory
    .slice(-4)
    .map((item) => `${item.name}: ${item.summary}`)
    .join(" | ");
}

function findRelevantMemory(keywords) {
  return state.memory
    .slice()
    .reverse()
    .find((item) => {
      const haystack = `${item.name} ${item.summary} ${item.content || ""}`.toLowerCase();
      return keywords.some((keyword) => haystack.includes(keyword));
    });
}

function containsAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
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

  utterance.onstart = () => setSpeechStatus("Speaking", true);
  utterance.onend = () => setSpeechStatus("Text ready", false);
  utterance.onerror = () => setSpeechStatus("Speech unavailable", false);

  window.speechSynthesis.speak(utterance);
}

function loadSystemVoices() {
  state.voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  els.systemVoice.innerHTML = "";

  if (!state.voices.length) {
    const option = document.createElement("option");
    option.textContent = "System default voice";
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

function setupSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    els.micButton.disabled = true;
    els.micButton.title = "Speech recognition is unavailable in this browser. Type instead.";
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
    setSpeechStatus("Voice input unavailable", false);
    addActivity("Voice input issue", "Chrome did not allow speech recognition. Typing still works.");
  };

  state.recognition.onend = () => {
    state.recognizing = false;
    els.micButton.classList.remove("recording");
    setSpeechStatus("Text ready", false);
  };
}

function setSpeechStatus(label, active) {
  els.speechStatus.textContent = label;
  els.voiceOrb.classList.toggle("listening", active);
}

function wireEvents() {
  els.promptForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handlePrompt(els.promptInput.value);
  });

  els.micButton.addEventListener("click", () => {
    if (!state.recognition) return;
    if (state.recognizing) {
      state.recognition.stop();
    } else {
      state.recognition.start();
    }
  });

  els.systemVoice.addEventListener("change", (event) => {
    state.selectedVoiceURI = event.target.value;
    addActivity("Changed browser voice", event.target.selectedOptions[0]?.textContent || "System default");
  });

  els.agentMode.addEventListener("change", (event) => {
    state.mode = event.target.value;
    addActivity("Changed conversation mode", `Auralis is now in ${modeLabel()} mode.`);
  });

  els.sampleVoice.addEventListener("click", () => {
    const persona = getPersona();
    speak(`I'm ${persona.name}, the ${persona.style.toLowerCase()} voice for Auralis. Upload something or ask me to pitch it.`);
  });

  els.knowledgeUpload.addEventListener("change", (event) => {
    handleKnowledgeFiles([...event.target.files]);
    event.target.value = "";
  });

  els.imageUpload.addEventListener("change", (event) => {
    handleImageFiles([...event.target.files]);
    event.target.value = "";
  });

  els.saveContext.addEventListener("click", () => {
    const content = els.manualContext.value.trim();
    if (!content) return;

    state.memory.push({
      type: "note",
      name: `Pasted context ${state.memory.length}`,
      summary: summarizeText(content),
      content,
      createdAt: new Date().toISOString()
    });
    els.manualContext.value = "";
    renderMemory();
    addActivity("Saved pasted context", "Added manual notes to this browser session.");
  });

  document.addEventListener("dragover", (event) => event.preventDefault());
  document.addEventListener("drop", (event) => {
    event.preventDefault();
    const files = [...event.dataTransfer.files];
    const images = files.filter((file) => file.type.startsWith("image/"));
    const docs = files.filter((file) => !file.type.startsWith("image/"));
    if (docs.length) handleKnowledgeFiles(docs);
    if (images.length) handleImageFiles(images);
  });
}

async function handleKnowledgeFiles(files) {
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
    addActivity("Read uploaded file", `${file.name} was added to session memory.`);
  }

  renderMemory();
  addMessage("agent", `I added ${files.length} file${files.length === 1 ? "" : "s"} to memory. Ask me to summarize, pitch, compare, or pull details from them.`);
}

async function handleImageFiles(files) {
  for (const file of files) {
    const preview = await readAsDataUrl(file);
    const dimensions = await getImageDimensions(preview);
    const summary = `Image file, ${(file.size / 1024).toFixed(1)} KB, ${dimensions.width}x${dimensions.height}px. I can use its file details and preview in this local demo; production vision would add object and text understanding.`;

    state.memory.push({
      type: "image",
      name: file.name,
      summary,
      preview,
      content: `${file.name} ${summary}`,
      createdAt: new Date().toISOString()
    });
    addActivity("Read uploaded image", `${file.name}: ${dimensions.width}x${dimensions.height}px.`);
  }

  renderMemory();
  addMessage("agent", `I added ${files.length} image${files.length === 1 ? "" : "s"} to memory. Ask me what I can infer from them or how they should be used.`);
}

function summarizeText(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "Empty text file.";

  const words = normalized.split(/\s+/).length;
  const sentences = normalized.match(/[^.!?]+[.!?]+/g) || [normalized];
  const firstSentence = sentences[0].trim().slice(0, 220);
  const keywords = topKeywords(normalized).slice(0, 5);
  return `${words} words. Starts with: "${firstSentence}"${keywords.length ? `. Keywords: ${keywords.join(", ")}.` : "."}`;
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
    summary: `${dataRows.length} rows and ${headers.length} columns. Columns: ${headers.slice(0, 8).join(", ")}${headers.length > 8 ? ", ..." : "."}`,
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
    .match(/[a-z0-9][a-z0-9-]{2,}/g)
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
