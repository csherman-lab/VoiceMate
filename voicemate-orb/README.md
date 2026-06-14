# VoiceMate Orb — Portable Bundle

A self-contained copy of the VoiceMate voice bubble (orb) with all emotions, eye animations, and audio-reactive pulsing. No React, no npm dependencies — just HTML, CSS, and vanilla JavaScript.

## Files

| File | Purpose |
|------|---------|
| `voicemate-orb.css` | All orb visuals, keyframe animations, mood classes |
| `voicemate-orb.js` | Eye gaze, blinks, squint, moods, audio reaction API |
| `voicemate-orb.html` | Interactive demo (open in a browser) |
| `voicemate-orb-standalone.html` | Single file with everything inlined (easiest to drop anywhere) |

## Quick start

### Option A — Three files

```html
<link rel="stylesheet" href="voicemate-orb.css" />
<div class="orb orb--hero" id="myOrb">
  <span class="orb-eyes"><i></i><i></i></span>
</div>
<script src="voicemate-orb.js"></script>
<script>
  VoiceMateOrb.init({ selector: "#myOrb", typingTarget: "#myInput" });
</script>
```

### Option B — Single file

Copy `voicemate-orb-standalone.html` into your project and open it, or extract the `<style>` and `<script>` blocks into your app.

## HTML structure

The orb is a `div` with two eye elements inside a `span`:

```html
<div class="orb orb--hero" id="myOrb" role="button" tabindex="0" aria-label="VoiceMate">
  <span class="orb-eyes"><i></i><i></i></span>
</div>
```

Size presets: `orb--sm` (120px), `orb--md` (200px), `orb--hero` (260px), `orb--focus` (280px), `orb--lg` (320px). Or set your own `width` / `height` on `.orb`.

## JavaScript API

```javascript
// Initialize (required)
VoiceMateOrb.init({
  selector: ".orb",           // CSS selector, Element, or array of elements
  typingTarget: "#prompt",    // optional — eyes look down when this input is focused
  followCursor: true,         // optional — gaze follows mouse when idle
  ariaLabel: "VoiceMate"      // optional
});

// Voice / chat states (recommended high-level helper)
VoiceMateOrb.setStatus({ label: "Listening", listening: true });
VoiceMateOrb.setStatus({ label: "Speaking", speaking: true });
VoiceMateOrb.setStatus({ label: "Thinking" });
VoiceMateOrb.setStatus({ label: "Ready", online: false }); // offline mood

// Direct mood control
VoiceMateOrb.setMood("confused");  // idle | listening | speaking | confused | error | offline | reading

// Eye behavior
VoiceMateOrb.setEyeMode("thinking");  // idle | listening | thinking | speaking

// Expressions
VoiceMateOrb.setExpression("curious", 2600);  // head tilt, auto-clears after ms
VoiceMateOrb.detectExpression("How are you?"); // returns "curious" for questions

// Tap reaction
VoiceMateOrb.squint();

// Audio-reactive pulse (Web Audio API)
const analyser = audioContext.createAnalyser();
VoiceMateOrb.startAudioReaction(analyser, { gain: 3.4 });
VoiceMateOrb.stopAudioReaction();

// Live call mode (disables cursor follow)
VoiceMateOrb.setLive(true);

// Cleanup
VoiceMateOrb.destroy();
```

## Moods & animations

| State | CSS class | Visual |
|-------|-----------|--------|
| Idle | *(default)* | Slow hue shift + internal swirl |
| Listening | `.listening` | Breathe pulse + alert eyes |
| Speaking | `.speaking` | Stronger pulse + saturation |
| Confused | `.confused` | Desaturated + tilted eyes |
| Error | `.error` | Dimmed |
| Offline | `.offline` | Dimmed, low saturation |
| Reading | `.reading` | Eyes shift down |
| Audio reactive | `.reacting` | Scale tracks `--level` from audio RMS |
| Squint (tap) | `.orb-eyes.squinting` | Happy squint on click |
| Blink | `.orb-eyes.blinking` | Natural random blinks |
| Curious | JS `setExpression("curious")` | 7° head tilt |

## React example

```jsx
import { useEffect, useRef } from "react";
import "../voicemate-orb/voicemate-orb.css";

export function VoiceOrb({ listening, speaking }) {
  const ref = useRef(null);

  useEffect(() => {
    window.VoiceMateOrb.init({ selector: ref.current });
    return () => window.VoiceMateOrb.destroy();
  }, []);

  useEffect(() => {
    window.VoiceMateOrb.setStatus({ listening, speaking });
  }, [listening, speaking]);

  return (
    <div className="orb orb--md" ref={ref}>
      <span className="orb-eyes"><i></i><i></i></span>
    </div>
  );
}
```

Load `voicemate-orb.js` via a `<script>` tag or bundle it — it attaches to `window.VoiceMateOrb`.

## License

Same as the VoiceMate project. Extracted from the VoiceMate voice agent UI.
