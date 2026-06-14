/**
 * VoiceMate Orb — standalone bubble with emotions and animations.
 * Vanilla JS, no dependencies. Works in any HTML page or can be wrapped in React/Vue.
 *
 * Usage:
 *   VoiceMateOrb.init({ selector: ".orb" });
 *   VoiceMateOrb.setStatus({ listening: true });
 *   VoiceMateOrb.setMood("listening");
 *   VoiceMateOrb.setExpression("curious");
 *   VoiceMateOrb.squint();
 */
(function (global) {
  "use strict";

  const MOODS = ["listening", "speaking", "confused", "error", "offline", "reading"];

  const config = {
    selector: ".orb",
    typingTarget: null,
    followCursor: true,
    ariaLabel: "VoiceMate"
  };

  const state = {
    orbs: [],
    eyeEls: [],
    mode: "idle",
    expr: null,
    gx: 0,
    gy: 0,
    tx: 0,
    ty: 0,
    rot: 0,
    mouseX: 0,
    mouseY: 0,
    mouseTs: -9999,
    nextSaccade: 0,
    live: false,
    streaming: false,
    backendOnline: true,
    lastUserActivity: performance.now(),
    pauseCuriousAt: 0,
    audioRaf: null,
    smoothLevel: 0,
    audioActive: false,
    exprTimer: null,
    blinkTimer: null,
    loopRunning: false,
    mouseHandler: null,
    activityHandler: null
  };

  function clampEye(value) {
    return Math.min(1, Math.max(-1, value));
  }

  function resolveOrbs(selector) {
    if (!selector) return [];
    if (typeof selector === "string") return Array.from(document.querySelectorAll(selector));
    if (selector instanceof Element) return [selector];
    if (Array.isArray(selector) || selector instanceof NodeList) return Array.from(selector);
    return [];
  }

  function activeOrbRect() {
    for (const orb of state.orbs) {
      const rect = orb.getBoundingClientRect();
      if (rect.width && rect.bottom > 0 && rect.top < window.innerHeight) return rect;
    }
    return null;
  }

  function updateOrbTurn() {
    const tiltY = state.gx * 15;
    const tiltX = state.gy * -11;
    const glintX = state.gx * -12;
    const glintY = state.gy * -8;
    const fluidX = state.gx * 10;
    const fluidY = state.gy * 8;
    const glintRot = state.gx * -5;
    const fluidRot = state.gx * 8;

    for (const orb of state.orbs) {
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

  function eyeLoop() {
    if (!state.loopRunning) return;

    const now = performance.now();
    const mouseActive = now - state.mouseTs < 2500;
    const typingTarget = config.typingTarget
      ? (typeof config.typingTarget === "string"
        ? document.querySelector(config.typingTarget)
        : config.typingTarget)
      : null;
    const typing = typingTarget && document.activeElement === typingTarget;

    if (state.mode === "speaking") {
      if (now > state.nextSaccade) {
        state.tx = (Math.random() - 0.5) * 0.18;
        state.ty = (Math.random() - 0.5) * 0.14;
        state.nextSaccade = now + 600 + Math.random() * 900;
      }
    } else if (state.mode === "thinking") {
      state.tx = -0.45;
      state.ty = -0.62;
    } else if (state.mode === "listening") {
      if (now > state.nextSaccade) {
        state.tx = (Math.random() - 0.5) * 0.3;
        state.ty = (Math.random() - 0.5) * 0.2;
        state.nextSaccade = now + 900 + Math.random() * 1500;
      }
    } else if (typing) {
      state.tx = 0;
      state.ty = 0.55;
    } else if (config.followCursor && !state.live && mouseActive) {
      const rect = activeOrbRect();
      if (rect) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        state.tx = clampEye((state.mouseX - cx) / (rect.width * 0.9));
        state.ty = clampEye((state.mouseY - cy) / (rect.height * 0.9));
      }
    } else if (now > state.nextSaccade) {
      state.tx = Math.random() < 0.4 ? 0 : Math.random() * 1.2 - 0.6;
      state.ty = Math.random() * 0.7 - 0.35;
      state.nextSaccade = now + 1400 + Math.random() * 3000;
    }

    const idleMs = now - state.lastUserActivity;
    if (!state.live && !state.streaming && state.mode === "idle" && idleMs > 8000 && now > state.pauseCuriousAt) {
      state.pauseCuriousAt = now + 14000;
      setExpression("curious");
      blinkOnce();
    }

    state.gx += (state.tx - state.gx) * 0.12;
    state.gy += (state.ty - state.gy) * 0.12;
    const rotTarget = state.expr === "curious" ? 7 : 0;
    state.rot += (rotTarget - state.rot) * 0.15;
    const transform = `translate(${(state.gx * 8).toFixed(2)}%, ${(state.gy * 6).toFixed(2)}%) rotate(${state.rot.toFixed(2)}deg)`;
    for (const el of state.eyeEls) el.style.transform = transform;
    updateOrbTurn();

    requestAnimationFrame(eyeLoop);
  }

  function blinkOnce(done) {
    state.eyeEls.forEach((el) => el.classList.add("blinking"));
    window.setTimeout(() => {
      state.eyeEls.forEach((el) => el.classList.remove("blinking"));
      if (done) done();
    }, 120);
  }

  function scheduleBlink() {
    const delay = 1800 + Math.random() * 4200;
    state.blinkTimer = window.setTimeout(() => {
      blinkOnce(() => {
        if (Math.random() < 0.25) {
          window.setTimeout(() => blinkOnce(scheduleBlink), 180);
        } else {
          scheduleBlink();
        }
      });
    }, delay);
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

  function init(options = {}) {
    destroy();
    Object.assign(config, options);
    state.orbs = resolveOrbs(config.selector);
    state.eyeEls = state.orbs
      .map((orb) => orb.querySelector(".orb-eyes"))
      .filter(Boolean);

    if (!state.orbs.length) {
      console.warn("[VoiceMateOrb] No orb elements found for selector:", config.selector);
      return VoiceMateOrb;
    }

    for (const orb of state.orbs) {
      orb.setAttribute("tabindex", "0");
      orb.setAttribute("role", "button");
      orb.setAttribute("aria-label", config.ariaLabel);
      orb.addEventListener("click", () => squint(orb));
      orb.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          squint(orb);
        }
      });
    }

    state.mouseHandler = (event) => {
      state.mouseX = event.clientX;
      state.mouseY = event.clientY;
      state.mouseTs = performance.now();
    };
    state.activityHandler = () => {
      state.lastUserActivity = performance.now();
    };

    if (config.followCursor) {
      window.addEventListener("mousemove", state.mouseHandler);
    }
    window.addEventListener("pointerdown", state.activityHandler);
    window.addEventListener("keydown", state.activityHandler);

    state.loopRunning = true;
    scheduleBlink();
    requestAnimationFrame(eyeLoop);

    return VoiceMateOrb;
  }

  function destroy() {
    state.loopRunning = false;
    if (state.blinkTimer) clearTimeout(state.blinkTimer);
    if (state.exprTimer) clearTimeout(state.exprTimer);
    stopAudioReaction();
    if (state.mouseHandler) window.removeEventListener("mousemove", state.mouseHandler);
    if (state.activityHandler) {
      window.removeEventListener("pointerdown", state.activityHandler);
      window.removeEventListener("keydown", state.activityHandler);
    }
    state.orbs = [];
    state.eyeEls = [];
    state.mouseHandler = null;
    state.activityHandler = null;
    return VoiceMateOrb;
  }

  function setEyeMode(mode) {
    if (state.mode === mode) return VoiceMateOrb;
    state.mode = mode;
    state.eyeEls.forEach((el) => el.classList.toggle("alert", mode === "listening"));
    return VoiceMateOrb;
  }

  function setMood(mood) {
    const active = mood === "idle" ? null : mood;
    for (const orb of state.orbs) {
      MOODS.forEach((name) => orb.classList.toggle(name, name === active));
    }
    return VoiceMateOrb;
  }

  /**
   * High-level status helper — maps voice/chat states to orb classes and eye modes.
   * @param {{ label?: string, listening?: boolean, speaking?: boolean, online?: boolean }} status
   */
  function setStatus(status = {}) {
    const { label = "", listening = false, speaking = false, online = true } = status;
    const normalized = String(label).toLowerCase();
    state.backendOnline = online;

    for (const orb of state.orbs) {
      orb.classList.toggle("listening", Boolean(listening));
      orb.classList.toggle("speaking", Boolean(speaking));
    }

    if (speaking) {
      setEyeMode("speaking");
      setMood("speaking");
    } else if (listening || normalized.includes("you're speaking")) {
      setEyeMode("listening");
      setMood("listening");
    } else if (normalized.includes("thinking") || normalized.includes("connecting")) {
      setEyeMode("thinking");
      setMood("idle");
    } else if (normalized.includes("error") || normalized.includes("interrupted")) {
      setMood("error");
    } else {
      setEyeMode("idle");
      setMood(state.backendOnline ? "idle" : "offline");
    }

    return VoiceMateOrb;
  }

  function squint(orb) {
    const target = orb || state.orbs[0];
    if (!target) return VoiceMateOrb;
    const eyeEl = target.querySelector(".orb-eyes");
    if (!eyeEl) return VoiceMateOrb;
    eyeEl.classList.remove("squinting");
    void eyeEl.offsetWidth;
    eyeEl.classList.add("squinting");
    window.setTimeout(() => eyeEl.classList.remove("squinting"), 500);
    return VoiceMateOrb;
  }

  function detectExpression(text) {
    if (String(text || "").trim().endsWith("?")) return "curious";
    return null;
  }

  function setExpression(type, durationMs = 0) {
    clearTimeout(state.exprTimer);
    state.expr = type === "curious" ? "curious" : null;
    if (durationMs > 0) {
      state.exprTimer = window.setTimeout(() => {
        state.expr = null;
      }, durationMs);
    }
    return VoiceMateOrb;
  }

  function setLive(active) {
    state.live = Boolean(active);
    return VoiceMateOrb;
  }

  function setStreaming(active) {
    state.streaming = Boolean(active);
    return VoiceMateOrb;
  }

  /**
   * Pulse the orb from a Web Audio AnalyserNode (TTS or live voice).
   * @param {AnalyserNode} analyser
   * @param {{ gain?: number }} options
   */
  function startAudioReaction(analyser, options = {}) {
    if (!analyser || !state.orbs.length) return VoiceMateOrb;
    const gain = options.gain ?? 3.4;
    stopAudioReaction();
    state.audioActive = true;
    setStatus({ label: "Speaking", speaking: true });
    for (const orb of state.orbs) orb.classList.add("reacting");

    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      if (!state.audioActive) return;
      const raw = Math.min(1, analyserRms(analyser, data) * gain);
      state.smoothLevel += (raw - state.smoothLevel) * 0.3;
      for (const orb of state.orbs) {
        orb.style.setProperty("--level", state.smoothLevel.toFixed(3));
      }
      state.audioRaf = requestAnimationFrame(loop);
    };
    state.audioRaf = requestAnimationFrame(loop);
    return VoiceMateOrb;
  }

  function stopAudioReaction() {
    state.audioActive = false;
    if (state.audioRaf) {
      cancelAnimationFrame(state.audioRaf);
      state.audioRaf = null;
    }
    state.smoothLevel = 0;
    for (const orb of state.orbs) {
      orb.classList.remove("reacting");
      orb.style.removeProperty("--level");
    }
    return VoiceMateOrb;
  }

  function createOrbMarkup(options = {}) {
    const sizeClass = options.size ? ` orb--${options.size}` : " orb--hero";
    const id = options.id ? ` id="${options.id}"` : "";
    const extraClass = options.className ? ` ${options.className}` : "";
    return `<div class="orb${sizeClass}${extraClass}"${id} role="button" tabindex="0" aria-label="${config.ariaLabel}">
  <span class="orb-eyes"><i></i><i></i></span>
</div>`;
  }

  const VoiceMateOrb = {
    init,
    destroy,
    setStatus,
    setMood,
    setEyeMode,
    setExpression,
    detectExpression,
    squint,
    setLive,
    setStreaming,
    startAudioReaction,
    stopAudioReaction,
    createOrbMarkup,
    MOODS
  };

  global.VoiceMateOrb = VoiceMateOrb;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = VoiceMateOrb;
  }
})(typeof window !== "undefined" ? window : globalThis);
