// Phase 15 – Offline-Testmatrix (Produktionsmodus, headless Chrome ohne GPU, eigenes Wegwerf-Profil).
// Voraussetzung: `next build` wurde ausgefuehrt. Aufruf: node tests/e2e/offline-matrix.mjs
// Umgebung: CHROME_PATH (Standard: Windows-Chrome), E2E_PORT (3311), E2E_DEBUG_PORT (9333).
import { spawn, execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { setPriority, tmpdir } from "node:os";
import { join } from "node:path";
import { connect, sleep } from "./cdp-client.mjs";

const PORT = Number(process.env.E2E_PORT ?? 3311);
const DEBUG_PORT = Number(process.env.E2E_DEBUG_PORT ?? 9333);
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROOT = new URL("../..", import.meta.url);
const SW_FILE = new URL("public/sw.js", ROOT);
const VIDEO = "/video/test_video.mp4?v=1";
const PROFILE = mkdtempSync(join(tmpdir(), "renkes-e2e-"));
const results = [];

function check(area, name, passed, info = "") {
  results.push({ area, name, passed: Boolean(passed), info: String(info) });
  console.log(`${passed ? "OK    " : "FEHLER"} [${area}] ${name}${info ? " | " + info : ""}`);
}

function lowPriority(child) {
  try { setPriority(child.pid, 10); } catch { /* nicht kritisch */ }
  return child;
}

function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === "win32") {
    try { execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: "ignore" }); } catch { /* bereits beendet */ }
  } else {
    child.kill("SIGKILL");
  }
}

async function startServer() {
  const nextBin = new URL("node_modules/next/dist/bin/next", ROOT);
  const server = lowPriority(spawn(process.execPath, [nextBin.pathname.replace(/^\/([A-Za-z]:)/, "$1"), "start", "-p", String(PORT)], { cwd: ROOT, stdio: "ignore" }));
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${BASE}/offline`)).ok) return server; } catch { /* startet noch */ }
    await sleep(1000);
  }
  throw new Error("Server nicht erreichbar");
}

async function startChrome() {
  const chrome = lowPriority(spawn(CHROME, ["--headless=new", "--disable-gpu", `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" }));
  for (let i = 0; i < 30; i++) {
    try { await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`); return chrome; } catch { await sleep(500); }
  }
  throw new Error("Chrome nicht erreichbar");
}

const cards = (c) => c.evaluate("document.querySelectorAll('a[href^=\"/recipes/\"]').length");
const banner = (c) => c.evaluate("!!document.querySelector('[data-offline-banner]')");
const idbCount = (c) => c.evaluate("new Promise((r) => { const q = indexedDB.open('renkes-kochbuch'); q.onsuccess = () => { try { const t = q.result.transaction('recipes').objectStore('recipes').count(); t.onsuccess = () => r(t.result); } catch { r(0); } }; q.onerror = () => r(-1); })");
const pageText = (c) => c.evaluate("document.body.innerText");
const isOfflinePage = async (c) => (await pageText(c)).includes("offline noch nicht verfügbar");

let server;
let chrome;
const swOriginal = readFileSync(SW_FILE, "utf8");

try {
  server = await startServer();
  chrome = await startChrome();
  let c = await connect(DEBUG_PORT);

  // H – Erststart mit gescheitertem Abgleich, Nachholen nach Rueckkehr der Verbindung
  await c.send("Network.setBlockedURLs", { urls: ["*/api/recipes/sync*"] });
  await c.navigate(`${BASE}/`); await sleep(4000);
  check("Statusschicht", "Erststart ohne Abgleich: 0 Karten, IndexedDB leer", (await cards(c)) === 0 && (await idbCount(c)) <= 0);
  await c.send("Network.setBlockedURLs", { urls: [] });
  await c.setOffline(true); await sleep(300); await c.setOffline(false);
  let count = 0; for (let i = 0; i < 20 && count < 69; i++) { await sleep(1000); count = await cards(c); }
  check("Statusschicht", "Verbindung zurück: Abgleich nachgeholt, 69 Karten ohne Reload", count >= 69, `${count} Karten`);

  // A – Installation
  await c.evaluate("navigator.serviceWorker.ready.then(() => 1)", 180000);
  await c.navigate(`${BASE}/`); await sleep(2000);
  check("Installation", "Service Worker aktiv und Seite kontrolliert", await c.evaluate("!!navigator.serviceWorker.controller"));
  const shell = await c.evaluate("caches.open('renkes-shell-v3').then((x) => x.keys()).then((k) => k.map((r) => new URL(r.url).pathname))");
  check("Installation", "Shell-Precache enthält alle statischen Seiten", ["/", "/offline", "/chinesische-rezepte", "/stickers", "/danke-renke", "/add"].every((p) => shell.includes(p)), shell.join(" "));
  const statics = await c.evaluate("caches.open('renkes-next-static-v3').then((x) => x.keys()).then((k) => k.length)");
  check("Installation", "Seiten-Code (JS/CSS) vorab gespeichert", statics >= 10, `${statics} Dateien`);
  let images = 0; for (let i = 0; i < 60 && images < 109; i++) { images = await c.evaluate("caches.open('renkes-runtime-v3').then((x) => x.keys()).then((k) => k.filter((r) => new URL(r.url).pathname.startsWith('/images/')).length)"); if (images < 109) await sleep(2000); }
  check("Installation", "109 Kernbilder im Cache", images >= 109, `${images} Bilder`);
  check("Installation", "IndexedDB mit 69 Rezepten", (await idbCount(c)) === 69);
  const manifest = await c.evaluate("fetch('/manifest.webmanifest').then((r) => r.json())");
  const sizes = (manifest.icons ?? []).map((i) => i.sizes);
  check("Installierbarkeit", "Manifest: Name, start_url, standalone, Icons 192 und 512", Boolean(manifest.name) && manifest.start_url === "/" && manifest.display === "standalone" && sizes.includes("192x192") && sizes.includes("512x512"), JSON.stringify({ name: manifest.name, sizes }));
  let pages = 0; for (let i = 0; i < 60 && pages < 69; i++) { pages = await c.evaluate("caches.open('renkes-pages-v3').then((x) => x.keys()).then((k) => k.length)"); if (pages < 69) await sleep(2000); }
  check("Installation", "Alle 69 Rezept-Detailseiten vorab gespeichert", pages >= 69, `${pages} Detailseiten`);

  // H – Statushinweis, Websuche, Schreibformular, Dankesbuch (online/offline-Wechsel)
  await c.evaluate("(async () => { [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Suchzauber öffnen'))?.click(); await new Promise((r) => setTimeout(r, 400)); document.querySelector('#brixel-query').focus(); return 1; })()");
  await c.send("Input.insertText", { text: "Tomate" }); await sleep(400);
  const webLink = () => c.evaluate("!![...document.querySelectorAll('a')].find((a) => a.textContent.includes('im Web weitersuchen'))");
  check("Statusschicht", "Online: kein Statushinweis, Websuche-Link sichtbar", !(await banner(c)) && (await webLink()));
  await c.setOffline(true); await sleep(500);
  check("Statusschicht", "Offline: Statushinweis sichtbar, Websuche durch Hinweis ersetzt", (await banner(c)) && !(await webLink()) && (await c.evaluate("!!document.querySelector('[data-websearch-offline]')")));
  await c.setOffline(false); await sleep(500);
  check("Statusschicht", "Wieder online: Hinweis weg, Websuche-Link zurück", !(await banner(c)) && (await webLink()));
  await c.navigate(`${BASE}/danke-renke/eintrag/elias?token=${"x".repeat(24)}`); await sleep(2000);
  const saveDisabled = () => c.evaluate("[...document.querySelectorAll('button')].find((b) => b.textContent.includes('speichern')).disabled");
  await c.setOffline(true); await sleep(400);
  const offDisabled = await saveDisabled();
  await c.setOffline(false); await sleep(400);
  check("Statusschicht", "Schreibformular: offline gesperrt, online aktiv", offDisabled === true && (await saveDisabled()) === false);
  await c.send("Network.setBlockedURLs", { urls: ["*/api/thanks*"] });
  await c.navigate(`${BASE}/danke-renke`); await sleep(2500);
  const thanksNotice = () => c.evaluate("[...document.querySelectorAll('p[role=status]')].some((p) => p.textContent.includes('Einträge'))");
  const blockedNotice = await thanksNotice();
  await c.send("Network.setBlockedURLs", { urls: [] });
  await c.setOffline(true); await sleep(300); await c.setOffline(false); await sleep(3000);
  check("Statusschicht", "Dankesbuch: Hinweis bei fehlenden Einträgen, nach Rückkehr nachgeladen", blockedNotice && !(await thanksNotice()));

  // I – Video
  await c.navigate(`${BASE}/stickers`);
  let media = null; for (let i = 0; i < 60 && !media; i++) { media = await c.evaluate(`caches.open('renkes-media-v1').then((x) => x.match('${VIDEO}')).then((r) => r ? r.headers.get('Content-Length') : null)`); if (!media) await sleep(2000); }
  check("Video", "Nach Online-Besuch vollständig im Media-Cache", Number(media) > 0, `${media} Bytes`);

  // Eine Detailseite online besuchen (fuer den Offline-Test)
  await c.navigate(`${BASE}/`); await sleep(2000);
  const visited = await c.evaluate("document.querySelector('a[href^=\"/recipes/\"]').getAttribute('href')");
  const notVisited = await c.evaluate("[...document.querySelectorAll('a[href^=\"/recipes/\"]')].map((a) => a.getAttribute('href')).at(-1)");
  const clickTarget = await c.evaluate("[...document.querySelectorAll('a[href^=\"/recipes/\"]')].map((a) => a.getAttribute('href'))[1]");
  await c.navigate(`${BASE}${visited}`); await sleep(3000);
  check("Detail", "Online: Detailseite direkt aufgerufen", (await c.evaluate("!!document.querySelector('h1')")) && (await c.evaluate("location.pathname")) === visited);

  // G – Update
  await c.navigate(`${BASE}/chinesische-rezepte`); await sleep(1000);
  writeFileSync(SW_FILE, swOriginal + "\n// E2E-Testversion\n");
  await c.evaluate("window.__marke = 'vor-update'; navigator.serviceWorker.getRegistration().then((r) => r.update()).then(() => 1)");
  let updateBanner = false; for (let i = 0; i < 60 && !updateBanner; i++) { await sleep(1000); updateBanner = await c.evaluate("!!document.querySelector('[data-update-banner]')"); }
  check("Update", "Neue Version wartet, Hinweis erscheint, kein Reload vor dem Klick", updateBanner && (await c.evaluate("window.__marke")) === "vor-update");
  await c.evaluate("[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Jetzt aktualisieren')).click(); 1");
  let reloaded = false; for (let i = 0; i < 30 && !reloaded; i++) { await sleep(1000); try { reloaded = await c.evaluate("window.__marke === undefined && document.readyState === 'complete'"); } catch { /* laedt */ } }
  check("Update", "Nach dem Klick: neue Version aktiv, genau ein Reload", reloaded && (await c.evaluate("navigator.serviceWorker.getRegistration().then((r) => !r.waiting && r.active.state === 'activated')")));
  writeFileSync(SW_FILE, swOriginal);
  check("Update", "sw.js nach dem Test wiederhergestellt", readFileSync(SW_FILE, "utf8") === swOriginal);

  // J – Ausschluesse
  const keys = await c.evaluate("caches.keys().then((names) => Promise.all(names.map((n) => caches.open(n).then((x) => x.keys())))).then((all) => all.flat().map((r) => r.url))");
  check("Ausschlüsse", "Keine API-Antworten und keine Token-URLs im Cache", !keys.some((u) => u.includes("/api/") || /[?&][^=]*token/i.test(u)), `${keys.length} Einträge geprüft`);
  const estimate = await c.evaluate("navigator.storage.estimate().then((e) => ({ usage: e.usage, quota: e.quota }))");
  check("Speicher", "Belegung unter der Quota", estimate.usage < estimate.quota, `${(estimate.usage / 1048576).toFixed(1)} MiB belegt`);

  // B/C/D/E – Offline (Server beendet + Browser offline)
  stop(server); server = null; await sleep(1500);
  await c.setOffline(true);
  check("Offline", "Server wirklich beendet, Browser offline", (await fetch(`${BASE}/`).then(() => "an", () => "aus")) === "aus" && (await c.evaluate("navigator.onLine")) === false);
  await c.navigate(`${BASE}/`); await sleep(4000);
  check("Navigation", "Startseite: 69 Karten + Statushinweis", (await cards(c)) >= 69 && (await banner(c)));
  await c.send("Page.reload"); await sleep(1000); await c.waitForLoad(); await sleep(3000);
  check("Neu laden", "Startseite nach Reload offline: 69 Karten", (await cards(c)) >= 69);
  await c.evaluate("(async () => { [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Suchzauber öffnen'))?.click(); await new Promise((r) => setTimeout(r, 400)); const i = document.querySelector('#brixel-query'); i.focus(); return 1; })()");
  await c.send("Input.insertText", { text: "Hähnchen" });
  await c.evaluate("document.querySelector('#brixel-query').form.requestSubmit(); 1"); await sleep(1500);
  const hits = await cards(c);
  check("Suche", "Offline-Suche im Archiv liefert Treffer ohne Netz", hits > 0 && hits < 69, `${hits} Treffer für „Hähnchen“`);
  await c.navigate(`${BASE}/chinesische-rezepte`); await sleep(2500);
  check("Navigation", "Chinesische Rezepte offline", !(await isOfflinePage(c)) && (await c.evaluate("document.querySelectorAll('h2').length")) >= 20);
  await c.navigate(`${BASE}/stickers`); await sleep(5000);
  const video = await c.evaluate("(() => { const v = document.querySelector('video'); return v && { rs: v.readyState, err: v.error && v.error.code, t: v.currentTime }; })()");
  check("Video", "Offline: Video spielt aus dem Cache", video && video.err === null && video.rs >= 2 && video.t > 0, JSON.stringify(video));
  const range = await c.evaluate(`fetch('${VIDEO}', { headers: { Range: 'bytes=1000-1999' } }).then(async (r) => [r.status, (await r.arrayBuffer()).byteLength])`);
  const bad = await c.evaluate(`fetch('${VIDEO}', { headers: { Range: 'bytes=999999999-' } }).then((r) => r.status)`);
  check("Video", "Offline: Range 206 und außerhalb 416", range[0] === 206 && range[1] === 1000 && bad === 416, JSON.stringify({ range, bad }));
  await c.navigate(`${BASE}/danke-renke`); await sleep(2500);
  check("Navigation", "Dankesbuch offline mit Hinweis", !(await isOfflinePage(c)) && (await c.evaluate("[...document.querySelectorAll('p[role=status]')].some((p) => p.textContent.includes('Internetverbindung'))")));
  await c.navigate(`${BASE}/add`); await sleep(1500);
  check("Navigation", "/add offline", (await pageText(c)).includes("Rezept hinzufügen"));
  await c.navigate(`${BASE}${visited}`); await sleep(3000);
  check("Detail", "(a) Online direkt geladene Detailseite offline direkt aufrufbar", !(await isOfflinePage(c)) && (await c.evaluate("!!document.querySelector('h1') && document.querySelector('h1').textContent.length > 0")));
  await c.navigate(`${BASE}/`); await sleep(3000);
  await c.evaluate(`document.querySelector('a[href="${clickTarget}"]').click(); 1`); await sleep(3000);
  const inApp = await c.evaluate("({ pfad: location.pathname, titel: (document.querySelector('h1') || {}).textContent || '', offlineSeite: document.body.innerText.includes('offline noch nicht verfügbar') })");
  check("Detail", "(b) Offline in der App per Karte geöffnet", inApp.pfad === clickTarget && inApp.titel.length > 0 && !inApp.offlineSeite, JSON.stringify(inApp).slice(0, 120));
  await c.navigate(`${BASE}${notVisited}`); await sleep(2000);
  check("Detail", "(c) Nie besuchte Detailseite kalt offline mit Titel (Vorabspeicherung)", !(await isOfflinePage(c)) && (await c.evaluate("!!document.querySelector('h1') && document.querySelector('h1').textContent.length > 0")));
  await c.navigate(`${BASE}/recipes/999999`); await sleep(2000);
  check("Detail", "Unbekannte Rezept-ID offline → Offlineseite (Gegenfall)", await isOfflinePage(c));
  await c.navigate(`${BASE}/danke-renke/eintrag/marco?token=${"y".repeat(24)}`); await sleep(1500);
  check("Navigation", "Persönlicher Schreib-Link offline → eigene Offlineseite", (await isOfflinePage(c)) && (await pageText(c)).includes("Persönliche Schreib-Links"));
  await c.navigate(`${BASE}/gibt-es-nicht`); await sleep(1500);
  check("Navigation", "Unbekannte Route offline → Offlineseite", await isOfflinePage(c));

  // F – Persistenz ueber Browser-Neustart
  c.close(); stop(chrome); await sleep(2000);
  chrome = await startChrome(); c = await connect(DEBUG_PORT);
  await c.setOffline(true);
  await c.navigate(`${BASE}/`); await sleep(5000);
  check("Persistenz", "Nach Browser-Neustart offline: 69 Karten", (await cards(c)) >= 69);
  c.close();
} catch (error) {
  check("Ablauf", "Testmatrix ohne Abbruch", false, error.message);
} finally {
  writeFileSync(SW_FILE, swOriginal);
  stop(chrome);
  stop(server);
}

const failed = results.filter((r) => !r.passed);
console.log(`\nErgebnis: ${results.length - failed.length}/${results.length} bestanden`);
process.exitCode = failed.length ? 1 : 0;
