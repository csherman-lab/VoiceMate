const FALLBACK_KNOWLEDGE = {
  company: {
    name: "Deft.ai / Deft Robotics",
    oneLine:
      "Deft deploys wheeled humanoid robots at automotive manufacturing facilities to automate work that still needs humans.",
    positioning:
      "Deft integrates production solutions with robot foundation models, customer-specific training data, installation, safety design, monitoring, and ongoing software updates.",
    contact: {
      cta: "Book a call",
      email: "founders@deftai.co",
      phone: "510-833-3004"
    }
  },
  metrics: [
    { label: "Typical ROI period", value: "6-9 months" },
    { label: "Human speed from day one", value: "75%-95%" },
    { label: "Continuous operation", value: "24-hour operation" }
  ],
  customerProblems: [
    "The last 20% of factory work remains manual.",
    "Labor shortages and attrition make production planning harder.",
    "Rigid automation systems can break when workflows change."
  ],
  solution: [
    "Identify automation opportunities.",
    "Ship customer-configured robot hardware.",
    "Collect real production data.",
    "Retrain on the customer's specific work.",
    "Deploy with human oversight and remote monitoring."
  ],
  useCases: ["Line feeding", "Kitting", "Final assembly", "Flexible material handling"],
  benefits: ["Consistent execution", "Improved throughput", "Reduced downtime", "Lower labor risk"],
  engagementProcess: ["Discovery call", "Mutual NDA", "Share task videos", "Feasibility report", "POC", "Rollout"],
  voicePersonas: [
    { id: "avery", name: "Avery", style: "Warm, consultative, concise", bestFor: "Client discovery" },
    { id: "mira", name: "Mira", style: "Energetic, clear, optimistic", bestFor: "Website demos" },
    { id: "noah", name: "Noah", style: "Calm, technical, precise", bestFor: "Operations teams" }
  ],
  providerRecommendation: {
    shortAnswer:
      "Use LiveKit as the production orchestration layer. Test xAI for the cheapest integrated realtime path and OpenAI GPT-Realtime mini for stronger ecosystem maturity and model quality."
  }
};

const suggestedPrompts = [
  "What does Deft.ai do?",
  "Why is this better than traditional automation?",
  "How fast is ROI?",
  "What is the deployment process?",
  "Which voice AI provider should we use?",
  "What should a prospect do next?"
];

const state = {
  knowledge: FALLBACK_KNOWLEDGE,
  persona: "avery",
  voices: [],
  selectedVoiceURI: "",
  recognition: null,
  recognizing: false
};

const els = {
  personaList: document.querySelector("#personaList"),
  systemVoice: document.querySelector("#systemVoice"),
  sampleVoice: document.querySelector("#sampleVoice"),
  activePersonaName: document.querySelector("#activePersonaName"),
  speechStatus: document.querySelector("#speechStatus"),
  transcript: document.querySelector("#transcript"),
  promptForm: document.querySelector("#promptForm"),
  promptInput: document.querySelector("#promptInput"),
  micButton: document.querySelector("#micButton"),
  voiceOrb: document.querySelector("#voiceOrb"),
  quickPrompts: document.querySelector("#quickPrompts")
};

async function loadKnowledge() {
  try {
    const response = await fetch("data/deft-knowledge.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Knowledge request failed: ${response.status}`);
    state.knowledge = await response.json();
  } catch (error) {
    console.warn("Using fallback knowledge.", error);
  }
}

function renderPersonas() {
  els.personaList.innerHTML = "";
  state.knowledge.voicePersonas.forEach((persona) => {
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
      speak(`Hi, I'm ${persona.name}. ${persona.style}. How can I help with Deft today?`);
    });
    els.personaList.appendChild(button);
  });
}

function updatePersonaLabel() {
  const persona = getPersona();
  els.activePersonaName.textContent = persona.name;
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

  state.voices
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"))
    .concat(state.voices.filter((voice) => !voice.lang.toLowerCase().startsWith("en")))
    .forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} (${voice.lang})`;
      els.systemVoice.appendChild(option);
    });

  const preferred = state.voices.find((voice) => /samantha|ava|alloy|aria|jenny|natural/i.test(voice.name));
  state.selectedVoiceURI = preferred?.voiceURI || els.systemVoice.value;
  els.systemVoice.value = state.selectedVoiceURI;
}

function renderQuickPrompts() {
  suggestedPrompts.forEach((prompt) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = prompt;
    button.addEventListener("click", () => handlePrompt(prompt));
    els.quickPrompts.appendChild(button);
  });
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role}`;
  message.textContent = text;
  els.transcript.appendChild(message);
  els.transcript.scrollTop = els.transcript.scrollHeight;
}

function getPersona() {
  return state.knowledge.voicePersonas.find((persona) => persona.id === state.persona) || state.knowledge.voicePersonas[0];
}

function personaPrefix() {
  const persona = getPersona();
  if (persona.id === "mira") return "Absolutely.";
  if (persona.id === "noah") return "Here is the practical version.";
  return "Great question.";
}

function list(items, limit = 4) {
  return items.slice(0, limit).join("; ");
}

function metric(labelPart) {
  return state.knowledge.metrics.find((item) => item.label.toLowerCase().includes(labelPart));
}

function answerPrompt(rawPrompt) {
  const prompt = rawPrompt.toLowerCase();
  const k = state.knowledge;

  if (containsAny(prompt, ["xai", "openai", "livekit", "eleven", "voice ai", "provider", "stack", "cheaper", "better"])) {
    return `${personaPrefix()} ${k.providerRecommendation.shortAnswer} My practical recommendation is: xAI first for a low-cost realtime MVP, OpenAI GPT-Realtime mini when conversation quality and ecosystem maturity matter more, and LiveKit when Deft needs production orchestration, telephony, observability, and provider freedom.`;
  }

  if (containsAny(prompt, ["what does", "who is", "what is deft", "company", "deft.ai", "deft robotics"])) {
    return `${personaPrefix()} ${k.company.oneLine} The important distinction is that Deft does not just drop off hardware; it integrates a production solution around the customer's actual workflow, data, safety requirements, and operational goals.`;
  }

  if (containsAny(prompt, ["why", "awesome", "better", "traditional", "rigid", "manual", "problem"])) {
    return `${personaPrefix()} Deft is compelling because it targets the factory work that traditional automation struggles with: ${list(k.customerProblems, 3)}. The result is more consistent execution, less labor dependency, better throughput, and a path to scale across similar work cells.`;
  }

  if (containsAny(prompt, ["roi", "payback", "return", "cost", "price", "pricing", "economic"])) {
    const roi = metric("roi") || k.metrics[0];
    const speed = metric("human speed") || k.metrics[1];
    return `${personaPrefix()} Public Deft materials describe a ${roi.value} typical ROI period and ${speed.value} of human speed from day one. Actual economics should be validated per workflow using labor cost, shift coverage, downtime, throughput, payload, and integration scope.`;
  }

  if (containsAny(prompt, ["deploy", "deployment", "process", "poc", "pilot", "start", "next"])) {
    return `${personaPrefix()} The path is straightforward: ${list(k.engagementProcess, 7)}. For a serious prospect, I would guide them to book a discovery call and share short videos of the target task so Deft can assess feasibility quickly.`;
  }

  if (containsAny(prompt, ["task", "use case", "line feeding", "kitting", "assembly", "workflow"])) {
    return `${personaPrefix()} Good candidate workflows include ${list(k.useCases, 5)}. The pattern to look for is repetitive production work that still needs human flexibility because parts, bins, or edge cases vary.`;
  }

  if (containsAny(prompt, ["safe", "safety", "iso", "compliance", "risk"])) {
    return `${personaPrefix()} Deft positions safety as part of the deployment design. Public materials say applications are designed to comply with ISO 10218-2, and deployments include human oversight, safety fencing, monitoring, and retraining when edge cases appear.`;
  }

  if (containsAny(prompt, ["contact", "book", "call", "email", "phone", "talk to"])) {
    return `${personaPrefix()} The best next step is to ${k.company.contact.cta.toLowerCase()}. Deft's public contact details list ${k.company.contact.email} and ${k.company.contact.phone}. For a prospect, I would also ask for task videos before the feasibility review.`;
  }

  return `${personaPrefix()} I can help with Deft's robotics offering, ROI, deployment, candidate workflows, safety, and voice-agent provider choices. If this is a specific customer or technical requirement, I would capture the question and route it to a Deft human rather than inventing details.`;
}

function containsAny(value, needles) {
  return needles.some((needle) => value.includes(needle));
}

function handlePrompt(prompt) {
  const cleaned = prompt.trim();
  if (!cleaned) return;

  addMessage("user", cleaned);
  els.promptInput.value = "";

  window.setTimeout(() => {
    const answer = answerPrompt(cleaned);
    addMessage("agent", answer);
    speak(answer);
  }, 220);
}

function speak(text) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const selected = state.voices.find((voice) => voice.voiceURI === state.selectedVoiceURI);
  const persona = getPersona();

  if (selected) utterance.voice = selected;
  utterance.rate = persona.id === "mira" ? 1.04 : persona.id === "noah" ? 0.93 : 0.98;
  utterance.pitch = persona.id === "mira" ? 1.08 : persona.id === "noah" ? 0.92 : 1;

  utterance.onstart = () => setSpeechStatus("Speaking", true);
  utterance.onend = () => setSpeechStatus("Text ready", false);
  utterance.onerror = () => setSpeechStatus("Speech unavailable", false);

  window.speechSynthesis.speak(utterance);
}

function setupSpeechRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    els.micButton.disabled = true;
    els.micButton.title = "Speech recognition is unavailable in this browser.";
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
    els.voiceOrb.classList.add("listening");
    setSpeechStatus("Listening", true);
  };

  state.recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ");
    handlePrompt(transcript);
  };

  state.recognition.onerror = () => {
    setSpeechStatus("Voice input unavailable", false);
  };

  state.recognition.onend = () => {
    state.recognizing = false;
    els.micButton.classList.remove("recording");
    els.voiceOrb.classList.remove("listening");
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
  });

  els.sampleVoice.addEventListener("click", () => {
    const persona = getPersona();
    speak(`I'm ${persona.name}, your Deft voice agent. Ask me about robotics, ROI, deployment, or the best voice AI stack.`);
  });
}

async function init() {
  await loadKnowledge();
  renderPersonas();
  updatePersonaLabel();
  renderQuickPrompts();
  setupSpeechRecognition();
  wireEvents();

  if (window.speechSynthesis) {
    loadSystemVoices();
    window.speechSynthesis.onvoiceschanged = loadSystemVoices;
  }

  addMessage(
    "agent",
    "Hi, I'm Avery. I can explain Deft Robotics, qualify manufacturing workflows, discuss ROI and deployment, or compare voice AI providers for this project."
  );
}

init();
