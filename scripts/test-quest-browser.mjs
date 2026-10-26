// Layout do menu no Meta Quest (janela padrão 1280 × 670) via Chrome DevTools Protocol.
// Uso: node scripts/test-quest-browser.mjs [caminho/do/chrome]   (ou CHROME_PATH)
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const QUEST_3_UA = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/39.2.0.0.56.754450099 Chrome/136.0.7103.177 VR Safari/537.36';
const chromePath = process.argv[2] || process.env.CHROME_PATH || (
  process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : 'google-chrome-stable'
);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = await mkdtemp(join(tmpdir(), 'you-dance-quest-'));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5180', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=9342', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader', '--window-size=1280,670', 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
let socket;
let seq = 0;
const pending = new Map();
let failed = false;

async function waitFor(fn, timeout = 30000){
  const start = Date.now();
  while(Date.now() - start < timeout){
    try { const result = await fn(); if(result) return result; } catch {}
    await pause(250);
  }
  throw new Error(`Tempo esgotado: ${fn.toString().slice(0, 180)}`);
}
function send(method, params = {}){
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression){
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if(r.exceptionDetails) throw new Error(r.exceptionDetails.text + ': ' + r.exceptionDetails.exception?.description);
  return r.result.value;
}
async function check(name, fn){
  try { await fn(); console.log('PASS:', name); }
  catch(error){ failed = true; console.log('FAIL:', name, '\n ', error.message); }
}

try {
  await waitFor(async () => (await fetch('http://127.0.0.1:5180')).ok);
  const pages = await waitFor(async () => (await (await fetch('http://127.0.0.1:9342/json/list')).json()).filter(p => p.type === 'page'));
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if(!message.id) return;
    const p = pending.get(message.id); pending.delete(message.id);
    if(message.error) p?.reject(new Error(JSON.stringify(message.error))); else p?.resolve(message.result);
  });
  await send('Runtime.enable');
  await send('Network.setUserAgentOverride', { userAgent: QUEST_3_UA });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 670, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5180' });
  await waitFor(() => evaluate('typeof globalThis.enterInitialMenu === "function"'));

  await check('Quest detectado pelo user-agent', async () => {
    assert.equal(await evaluate('document.body.classList.contains("quest-browser")'), true);
  });

  await evaluate('document.querySelector("#introStart").click()');
  await waitFor(() => evaluate('document.querySelector("#introOverlay").hidden'));

  for(const tab of ['songs', 'players', 'settings', 'extras']){
    await check(`INICIAR PARTIDA visível e clicável na aba ${tab}`, async () => {
      await evaluate(`document.querySelector('#tab-${tab}').click()`);
      await pause(100);
      const layout = await evaluate(`(() => {
        const button = document.querySelector('#startGameButton');
        const r = button.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), viewport: innerHeight, onTop: !!hit && button.contains(hit) };
      })()`);
      assert.ok(layout.bottom <= layout.viewport, `botão termina em ${layout.bottom}px, janela tem ${layout.viewport}px`);
      assert.ok(layout.onTop, 'outro elemento cobre o centro do botão');
    });
  }
} catch(error){
  failed = true;
  console.error('FAIL:', error.message);
} finally {
  socket?.close();
  chrome.kill(); vite.kill();
}
process.exit(failed ? 1 : 0);
