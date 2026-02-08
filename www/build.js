#!/usr/bin/env node
/**
 * build.js — Combines HTML partials into a single index.html
 * 
 * Usage: node build.js
 * 
 * Edit your source files in www/partials/:
 *   auth.html      — Login, sign up, verify, onboarding
 *   app-shell.html — V4 UI views, panels, hidden data containers
 *   modals.html    — All modal overlays
 * 
 * Then run this script to produce www/index.html for deployment.
 */
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, 'www');
const read = (f) => fs.readFileSync(path.join(www, 'partials', f), 'utf8');

const auth = read('auth.html');
const shell = read('app-shell.html');
const modals = read('modals.html');

const head = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="LifeStack">
<meta name="theme-color" content="#556847">
<meta name="description" content="Life by Design - Plan adventures, capture memories, build habits">
<link rel="manifest" href="manifest.json">
<link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32.png">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<title>LifeStack v4</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,400&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<script>
const CONFIG = { API_URL: "https://yqdxeta204.execute-api.us-east-1.amazonaws.com/prod" };
</script>`;

const foot = `
<div id="toast" class="toast"></div>
<script src="ui.js"></script>
<script src="app.js"></script>
</body>
</html>`;

const html = [head, '', auth, '', shell, '', modals, '', foot].join('\n');

fs.writeFileSync(path.join(www, 'index.html'), html);

// Stats
const ids = new Set((html.match(/id="[^"]+"/g) || []).map(m => m.slice(4, -1)));
const lines = html.split('\n').length;
console.log(`✅ Built www/index.html (${lines} lines, ${ids.size} unique IDs)`);
