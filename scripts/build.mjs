// Builds the pre-compiled, fast-loading HTML pages from the src/ React sources.
//   index.html      ← src/progression-wheel.jsx   (the songwriting sketchpad)
//   transcribe.html ← src/tune-transcriber.jsx     (hum a tune → stave → MIDI)
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

async function compile({ src, component, tmp, title, extraHead = "", boot = "Tuning up…" }) {
  let code = readFileSync(src, "utf8");
  code = code.replace('const APP_VERSION = "dev";', `const APP_VERSION = ${JSON.stringify(pkg.version)};`);
  code = code.replace(/import \{[^}]*\} from "react";/,
    "const { useState, useMemo, useRef, useEffect } = React;");
  code = code.replace(`export default function ${component}(`, `function ${component}(`);
  code += `\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(${component}));\n`;
  writeFileSync(tmp + ".jsx", code);
  await build({ entryPoints: [tmp + ".jsx"], outfile: tmp + ".min.js",
    loader: { ".jsx": "jsx" }, jsx: "transform", minify: true, target: "es2018" });
  const js = readFileSync(tmp + ".min.js", "utf8");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#10151D">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
${extraHead}<style>html,body{margin:0;background:#10151D}#boot{color:#8B94A3;font-family:system-ui;padding:40px;text-align:center}</style>
</head>
<body>
<div id="root"><div id="boot">${boot}</div></div>
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>
${js}
</script>
<script>
if ("serviceWorker" in navigator && location.protocol.startsWith("http"))
  navigator.serviceWorker.register("sw.js").catch(() => {});
</script>
</body>
</html>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,650&family=Archivo:wght@400;500;600;700&display=swap" rel="stylesheet">\n`;

writeFileSync("index.html", await compile({
  src: "src/progression-wheel.jsx", component: "ProgressionWheel",
  tmp: "scripts/.app", title: "The Progression Wheel",
}));
console.log("built index.html");

writeFileSync("transcribe.html", await compile({
  src: "src/tune-transcriber.jsx", component: "TuneTranscriber",
  tmp: "scripts/.tt", title: "The Tune Transcriber",
  extraHead: FONTS, boot: "Warming up…",
}));
console.log("built transcribe.html");
