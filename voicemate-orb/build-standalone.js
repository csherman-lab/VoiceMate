// Builds voicemate-orb-standalone.html — single file with CSS + JS inlined.
// Usage: node build-standalone.js

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname);
const css = fs.readFileSync(path.join(ROOT, "voicemate-orb.css"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "voicemate-orb.js"), "utf8");

const html = `<!doctype html>
<!--
  VoiceMate Orb — standalone single-file bundle.
  Copy this file into any project. No server or build step required.
  Open in a browser to preview; extract <style> and <script> to embed elsewhere.
-->
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VoiceMate Orb</title>
  <style>
${css}

    :root {
      color-scheme: light dark;
      --page: #f5f6f8;
      --ink: #111114;
      --muted: #6e7480;
      --line: rgba(60, 60, 67, 0.14);
      --surface: #fff;
      font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--page); color: var(--ink); }
    .demo { max-width: 920px; margin: 0 auto; padding: 32px 20px 48px; display: grid; gap: 28px; }
    h1 { margin: 0; font-size: 1.75rem; letter-spacing: -0.03em; }
    .lead { margin: 8px 0 0; color: var(--muted); line-height: 1.5; }
    .stage { display: grid; place-items: center; padding: 28px 16px; border-radius: 28px; background: var(--surface); border: 1px solid var(--line); }
    .controls { display: grid; gap: 12px; padding: 20px; border-radius: 22px; background: var(--surface); border: 1px solid var(--line); }
    .btn-row { display: flex; flex-wrap: wrap; gap: 8px; }
    button { font: inherit; border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 8px 14px; cursor: pointer; }
    .demo-input { width: 100%; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; font: inherit; }
  </style>
</head>
<body>
  <main class="demo">
    <header>
      <h1>VoiceMate Orb</h1>
      <p class="lead">Portable voice bubble — click to squint, move cursor for gaze, use buttons to preview states.</p>
    </header>
    <section class="stage">
      <div class="orb orb--hero" id="demoOrb"><span class="orb-eyes"><i></i><i></i></span></div>
    </section>
    <section class="controls">
      <div class="btn-row" id="statusButtons">
        <button type="button" data-status='{"label":"Ready"}'>Idle</button>
        <button type="button" data-status='{"label":"Listening","listening":true}'>Listening</button>
        <button type="button" data-status='{"label":"Thinking"}'>Thinking</button>
        <button type="button" data-status='{"label":"Speaking","speaking":true}'>Speaking</button>
        <button type="button" data-status='{"label":"Ready","online":false}'>Offline</button>
      </div>
      <div class="btn-row" id="moodButtons">
        <button type="button" data-mood="confused">Confused</button>
        <button type="button" data-mood="reading">Reading</button>
        <button type="button" data-mood="error">Error</button>
      </div>
      <div class="btn-row">
        <button type="button" id="curiousBtn">Curious</button>
        <button type="button" id="squintBtn">Squint</button>
      </div>
      <input class="demo-input" id="demoInput" type="text" placeholder="Focus here — eyes look down while typing" />
    </section>
  </main>
  <script>
${js}
  </script>
  <script>
    VoiceMateOrb.init({ selector: "#demoOrb", typingTarget: "#demoInput" });
    document.getElementById("statusButtons").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-status]");
      if (btn) VoiceMateOrb.setStatus(JSON.parse(btn.dataset.status));
    });
    document.getElementById("moodButtons").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-mood]");
      if (btn) VoiceMateOrb.setMood(btn.dataset.mood);
    });
    document.getElementById("curiousBtn").onclick = () => VoiceMateOrb.setExpression("curious", 2600);
    document.getElementById("squintBtn").onclick = () => VoiceMateOrb.squint();
  </script>
</body>
</html>
`;

const outPath = path.join(ROOT, "voicemate-orb-standalone.html");
fs.writeFileSync(outPath, html);
console.log(`Wrote ${outPath} (${html.length.toLocaleString()} bytes)`);
