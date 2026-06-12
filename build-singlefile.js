// Builds open-voicemate.html by inlining styles.css and app.js into index.html.
// The single file works offline (file://) in local mode. Real Grok voice and
// live calls require the backend (npm start), since an API key must never ship
// inside a static file.
//
// Usage: node build-singlefile.js

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

const banner =
  "<!--\n" +
  "  VoiceMate — single-file build.\n" +
  "  This file runs in local mode when opened directly in Chrome (file://).\n" +
  "  For real Grok voice + live speech-to-speech calls, run the backend:\n" +
  "    npm start   (then open http://localhost:3000)\n" +
  "  Never paste a real xAI API key into this file; a browser file is public.\n" +
  "-->\n";

let out = html
  .replace(
    /<link rel="stylesheet" href="styles.css" \/>/,
    `<style>\n${css}\n</style>`
  )
  .replace(
    /<script src="app.js"><\/script>/,
    `<script>\n${js}\n</script>`
  );

out = out.replace(/<!doctype html>/i, `<!doctype html>\n${banner}`);

fs.writeFileSync(path.join(ROOT, "open-voicemate.html"), out);
console.log(`Wrote open-voicemate.html (${out.length.toLocaleString()} bytes)`);
