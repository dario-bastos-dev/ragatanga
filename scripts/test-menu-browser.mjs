// Integração real via Chrome DevTools Protocol, sem dependência de automação.
// Uso: node scripts/test-menu-browser.mjs [caminho/chrome.exe]
import { spawn } from 'node:child_process';
import { mkdir, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = resolve('output/menu-validation');
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'you-dance-chrome-'));
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
const chrome = spawn(process.argv[2] || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--remote-debugging-port=9338', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader', '--window-size=1600,900', 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
let socket;
const errors = [];
let seq = 0;
const pending = new Map();
const report = [];
const layoutOnly = process.env.YOU_DANCE_LAYOUT_ONLY === '1';
const cinema = process.env.YOU_DANCE_CINEMA === '1';
const cinemaOnly = process.env.YOU_DANCE_CINEMA_ONLY === '1';
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
async function click(selector){
  const rect = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...rect });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...rect });
}
async function key(key, code = key){
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: key === 'Enter' ? 13 : key === 'Escape' ? 27 : undefined });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
}
async function shot(name){
  await pause(500); // Aguarda o compositor aplicar o último estado de seleção.
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(output, name), Buffer.from(data, 'base64'));
}
async function check(name, fn){ await fn(); report.push(name); console.log('PASS:', name); }

try {
  await waitFor(async () => (await fetch('http://127.0.0.1:5178')).ok);
  const pages = await waitFor(async () => (await (await fetch('http://127.0.0.1:9338/json/list')).json()).filter(p => p.type === 'page'));
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if(message.id){
      const p = pending.get(message.id); pending.delete(message.id);
      if(message.error) p?.reject(new Error(JSON.stringify(message.error))); else p?.resolve(message.result);
    }
    if(message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if(message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push(message.params.args.map(x => x.value || x.description).join(' '));
  });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__menuTestMedia = new Set();
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args){
      window.__menuTestMedia.add(this);
      return play.apply(this, args);
    };
  ` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5178' });
  await waitFor(() => evaluate('typeof globalThis.enterInitialMenu === "function"'));
  await check('Abertura visível, menu bloqueado e Thriller preparada', async () => {
    assert.equal(await evaluate('!document.querySelector("#introOverlay").hidden && menu.inert && selectedSong === "thriller" && !menuPreviewState.active'), true);
    await shot('intro-1600x900.png');
  });
  if(cinema){
    await mkdir(resolve('output/intro-validation'), { recursive: true });
    await waitFor(() => evaluate('document.querySelector(".introLogo").complete && document.querySelector(".introLogo").naturalWidth > 0'));
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".introBackdrop")).backgroundImage.includes("menu-club.png")'), true);
    assert.equal(await evaluate('document.querySelector(".introLogo").src === document.querySelector(".menuHeroLogo").src'), true);
    await shot('../intro-validation/opening-1600x900.png');
    // Um gesto no cenário autoriza áudio sem sair da abertura.
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1480, y: 650, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1480, y: 650, button: 'left', clickCount: 1 });
    await waitFor(() => evaluate('document.querySelector("#introOverlay").dataset.audioMode === "analyser" && !getMenuThemeAudio().paused'));
    await pause(2500);
    const samples = await evaluate('(async()=>{const a=[];for(let i=0;i<80;i++){a.push(Number(document.querySelector("#introOverlay").style.getPropertyValue("--bass")));await new Promise(r=>setTimeout(r,50))}return a})()');
    console.log('Amostras de graves:', Math.min(...samples), Math.max(...samples), await evaluate('({time:getMenuThemeAudio().currentTime,volume:getMenuThemeAudio().volume,mode:document.querySelector("#introOverlay").dataset.audioMode})'));
    assert.ok(Math.max(...samples) - Math.min(...samples) > .01);
    console.log('PASS: graves reais variam com AnalyserNode', Math.min(...samples), Math.max(...samples));
    for(const [width,height] of [[390,844],[1366,768],[1600,900]]){
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await waitFor(() => evaluate(`innerWidth === ${width} && innerHeight === ${height} && Math.abs(Number(document.querySelector('#introOverlay').style.getPropertyValue('--scene-scale')) - Math.max(innerWidth/1672,innerHeight/941)) < .0001`));
      const projection = await evaluate('(()=>{const s=document.querySelector(".introScenery").getBoundingClientRect();const c=document.querySelector(".introCone").getBoundingClientRect();const scale=Math.max(innerWidth/1672,innerHeight/941);return {sx:s.x,sy:s.y,cx:c.x+c.width/2,cy:c.y+c.height/2,expectedX:(innerWidth-1672*scale)/2+82*scale,expectedY:(innerHeight-941*scale)/2+381.5*scale}})()');
      assert.ok(Math.abs(projection.cx - projection.expectedX) < 1, JSON.stringify({width,height,...projection}));
      assert.ok(Math.abs(projection.cy - projection.expectedY) < 1, JSON.stringify({width,height,...projection}));
      await shot(`../intro-validation/opening-${width}x${height}.png`);
    }
    // Pausa as animações reais nos tempos especificados para capturas reproduzíveis.
    // Só retém o timer de segurança da abertura, sem alterar seu código de produção.
    await evaluate('(()=>{const original=setTimeout;window.setTimeout=(fn,ms,...args)=>{if(ms===1500){window.__cinemaFinish=fn;return -999}return original(fn,ms,...args)};document.querySelector("#introStart").click();window.setTimeout=original;window.__cinemaAnimations=document.getAnimations();__cinemaAnimations.forEach(a=>a.pause())})()');
    const positions = [];
    for(const ms of [150,600,1100,1390]){
      await evaluate(`__cinemaAnimations.forEach(a=>{a.currentTime=${ms}})`);
      assert.equal(await evaluate('menu.inert && !menuEntered'), true);
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".menuHeroLogo")).visibility'), 'hidden');
      positions.push(await evaluate('(()=>{const a=document.querySelector(".introLogo").getBoundingClientRect();const b=document.querySelector(".menuHeroLogo").getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,targetX:b.x,targetY:b.y,targetWidth:b.width}})()'));
      await shot(`../intro-validation/transition-${ms}ms-1600x900.png`);
    }
    const last = positions.at(-1);
    assert.ok(Math.abs(last.x-last.targetX)<1 && Math.abs(last.y-last.targetY)<1 && Math.abs(last.width-last.targetWidth)<1);
    await evaluate('__cinemaFinish()');
    assert.equal(await evaluate('menuEntered && !menu.inert && !document.body.classList.contains("intro-pending")'), true);
    const analysis = await evaluate('(async()=>{const m=await import("/src/audio/intro-reactivity.js");return m.getThemeAnalysisState()})()');
    assert.equal(analysis.connected, true);
    await writeFile(resolve('output/intro-validation/report.json'), JSON.stringify({ samples, positions, analysis, errors }, null, 2));
    console.log('PASS: fases 150/600/1100/1390 ms, logo sem duplicação e alinhamento final');
    // Recomeça para testar também Enter real e toda a regressão do jogo.
    await send('Page.reload');
    await waitFor(() => evaluate('typeof globalThis.enterInitialMenu === "function" && !document.querySelector("#introOverlay").hidden'));
    if(cinemaOnly){
      await key('Enter');
      await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
      await waitFor(() => evaluate('menuEntered && !menu.inert'));
      assert.equal(await evaluate('document.querySelector("#introOverlay").hidden && selectedSong === "thriller"'), true);
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
      await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.AudioContext=undefined;window.webkitAudioContext=undefined;' });
      await send('Page.reload');
      await waitFor(() => evaluate('typeof globalThis.enterInitialMenu === "function" && !document.querySelector("#introOverlay").hidden'));
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".introOrbit ellipse")).animationName'), 'none');
      await key('Enter');
      await waitFor(() => evaluate('menuEntered && !menu.inert'));
      assert.equal(await evaluate('document.querySelector("#introOverlay").hidden'), true);
      console.log('PASS: resize durante a transição, movimento reduzido e navegador sem Web Audio');
    }
  }
  if(!cinemaOnly){
  await key('Enter');
  await waitFor(() => evaluate('menuEntered && document.querySelector("#introOverlay").hidden'));
  await check('Entrada com Thriller selecionada e quatro cards na ordem correta', async () => {
    assert.deepEqual(await evaluate('[...document.querySelectorAll(".songCard")].map(x=>x.dataset.song)'), ['thriller','ragatanga','macarena','ymca']);
    assert.equal(await evaluate('document.querySelector(".songCard.active").dataset.song'), 'thriller');
  });
  console.log('Aguardando modelos e animações reais...');
  let ready = true;
  try { await waitFor(() => evaluate('canStartSelectedSong() && !!dancers.p1'), 180000); }
  catch { ready = false; console.log('LIMITAÇÃO: assets 3D indisponíveis ou demorados:', await evaluate('document.querySelector("#menuStatus").textContent')); }
  await shot('menu-1600x900.png');
  const dimensions = await evaluate('(()=>{const r=document.querySelector(".menuCard").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scroll:document.querySelector(".menuCard").scrollHeight,client:document.querySelector(".menuCard").clientHeight}})()');
  console.log('Layout:', dimensions);
  await check('Painel dentro da tela e proporção próxima de 60%', async () => {
    assert.ok(dimensions.x >= 590 && dimensions.x <= 650);
    assert.ok(dimensions.width >= 900 && dimensions.width <= 990);
    assert.ok(dimensions.y + dimensions.height <= 901);
    assert.ok(dimensions.scroll <= dimensions.client + 2);
  });
  for(const tab of ['players','settings','extras','songs']){
    await click(`#tab-${tab}`);
    assert.equal(await evaluate(`!document.querySelector('#panel-${tab}').hidden`), true);
    if(tab === 'extras'){
      await click('#openLeaderboard');
      assert.equal(await evaluate('!leaderboardOverlay.classList.contains("hidden")'), true);
      await click('#closeLeaderboard');
    }
  }
  report.push('Quatro abas e ranking funcionais');
  for(const difficulty of ['easy','normal','hard','extreme']){
    await click(`[data-difficulty="${difficulty}"]`);
    assert.equal(await evaluate('selectedDifficulty'), difficulty);
  }
  await click('#twoPlayers');
  assert.equal(await evaluate('menuSelectedMode'), 2);
  await click('#tab-settings');
  await evaluate('document.querySelector("#menuThemeVolume").value=7;document.querySelector("#menuThemeVolume").dispatchEvent(new Event("input"));document.querySelector("#menuPreviewVolume").value=18;document.querySelector("#menuPreviewVolume").dispatchEvent(new Event("input"))');
  assert.deepEqual(await evaluate('menuAudioSettings'), { theme: .07, preview: .18 });
  await click('#tab-songs');
  report.push('Dificuldades, multiplayer e volumes compartilham estado real');
  await click('.songArrowNext');
  assert.equal(await evaluate('selectedSong'), 'ragatanga');
  await click('.songArrowPrev');
  assert.equal(await evaluate('selectedSong'), 'thriller');
  if(ready) await waitFor(() => evaluate('canStartSelectedSong() && !menuPreviewState.pending'), 180000);
  report.push('Setas selecionam as músicas reais');
  if(ready && !layoutOnly){
    await click('[data-song="thriller"]');
    await waitFor(() => evaluate('menuPreviewState.active && !menuPreviewState.pending'));
    await check('Prévia e coreografia Thriller terminam em 10 segundos', async () => {
      assert.equal(await evaluate('!!dancers.p1.action && !music.paused'), true);
      assert.equal(await evaluate('[...__menuTestMedia].some(a=>a.src.includes("menu-theme-love-me-again") && !a.paused)'), false);
      assert.equal(await evaluate('music.volume'), .18);
      await pause(11000);
      assert.equal(await evaluate('!menuPreviewState.active && music.paused && dancers.p1.menuState === "idle"'), true);
      assert.equal(await evaluate('[...__menuTestMedia].some(a=>a.src.includes("menu-theme-love-me-again") && !a.paused && a.volume === .07)'), true);
    });
    const cameraBefore = await evaluate('({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov})');
    // Testa cancelamento do pré-roll antes de deixar qualquer tarefa assíncrona avançar.
    await click('#startGameButton');
    await waitFor(() => evaluate('preRolling'));
    await key('Escape');
    await click('#pauseBackMenu');
    await pause(3500);
    await check('Retorno durante pré-roll não reinicia a partida nem a abertura', async () => {
      assert.equal(await evaluate('!running && !preRolling && menu.style.display !== "none" && document.querySelector("#introOverlay").hidden && selectedSong === "thriller" && selectedDifficulty === "extreme" && menuSelectedMode === 2'), true);
    });
    await click('#startGameButton');
    await waitFor(() => evaluate('running'), 15000);
    await check('Partida multiplayer usa câmera original e comandos reais', async () => {
      assert.deepEqual(await evaluate('({position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov})'), cameraBefore);
      assert.equal(await evaluate('mode === 2 && !!players.p2 && !music.paused && !menuPreviewState.active'), true);
      assert.equal(await evaluate('[...__menuTestMedia].some(a=>a.src.includes("menu-theme-love-me-again") && !a.paused)'), false);
      await evaluate(`window.__inputs=[];window.__originalInput=handleInput;window.__originalSpecial=handleSpecialInput;window.handleInput=(p,k)=>{__inputs.push([p.id,k]);return __originalInput(p,k)};window.handleSpecialInput=(p,k)=>{__inputs.push([p.id,k]);return __originalSpecial(p,k)}`);
      for(const k of ['a','w','s','d','ArrowLeft','ArrowUp','ArrowDown','ArrowRight','x','Enter']) await key(k);
      assert.equal(await evaluate('__inputs.length'), 10);
      await evaluate('window.handleInput=__originalInput;window.handleSpecialInput=__originalSpecial');
      assert.equal(await evaluate('running && document.querySelector("#introOverlay").hidden'), true);
    });
    await key('Escape');
    assert.equal(await evaluate('gamePaused && music.paused'), true);
    await click('#continueGame');
    await waitFor(() => evaluate('!gamePaused && !music.paused'));
    await key('Escape');
    await click('#pauseBackMenu');
    assert.equal(await evaluate('!running && menuSelectedMode === 2 && document.querySelectorAll(".notesLayer > *").length === 0'), true);
    // Exercita os caminhos reais de derrota, vitória e resultados.
    for(const path of ['defeat', 'results-back', 'results-choose']){
      await click('#startGameButton');
      await waitFor(() => evaluate('running'), 15000);
      if(path === 'defeat'){
        await evaluate('endByMistakeLimit(players.p1)');
        await waitFor(() => evaluate('!defeatOverlay.classList.contains("hidden")'), 15000);
        await click('#defeatRetry');
        await waitFor(() => evaluate('running'), 15000);
        assert.equal(await evaluate('mode === 2 && selectedSong === "thriller" && selectedDifficulty === "extreme"'), true);
        await evaluate('endByMistakeLimit(players.p1)');
        await waitFor(() => evaluate('!defeatOverlay.classList.contains("hidden")'), 15000);
        await click('#defeatBackMenu');
      }else{
        await evaluate('finish()');
        await waitFor(() => evaluate('!resultOverlay.classList.contains("hidden")'), 20000);
        if(path === 'results-back'){
          await click('#retryFromResults');
          await waitFor(() => evaluate('running'), 15000);
          await evaluate('finish()');
          await waitFor(() => evaluate('!resultOverlay.classList.contains("hidden")'), 20000);
        }
        await click(path === 'results-back' ? '#backMenu' : '#chooseMusicFromResults');
      }
      assert.equal(await evaluate('!running && !preRolling && menu.style.display !== "none" && document.querySelector("#introOverlay").hidden'), true);
      report.push(`Retorno ao menu: ${path}`);
    }
    for(const song of ['ragatanga','macarena','ymca','thriller']){
      await click(`[data-song="${song}"]`);
      await waitFor(() => evaluate('canStartSelectedSong() && menuPreviewState.active && !menuPreviewState.pending'), 180000);
      assert.equal(await evaluate('selectedSong'), song);
      assert.equal(await evaluate('document.querySelector(".songCard.active").dataset.song'), song);
      assert.equal(await evaluate('!!dancers.p1?.object && !!dancers.p1?.action && !music.paused'), true);
      console.log('PASS: prévia e personagem', song);
      report.push(`Prévia e personagem: ${song}`);
    }
    await shot('menu-thriller-preview-1600x900.png');
    await click('#onePlayer');
    await click('[data-difficulty="easy"]');
    await click('#startGameButton');
    await waitFor(() => evaluate('running'), 15000);
    assert.equal(await evaluate('mode === 1 && players.p2 === null && !ringP2.visible'), true);
    await key('Escape');
    await click('#pauseBackMenu');
    report.push('Modo de um jogador inicia e retorna mantendo escolhas');
  }
  for(const [width,height] of [[1366,768],[900,900],[390,844]]){
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await pause(500);
    assert.equal(await evaluate('document.querySelector("#menuOverlay").scrollWidth <= innerWidth + 1'), true);
    await shot(`menu-${width}x${height}.png`);
    if(width <= 1000){
      const rect = await evaluate('(()=>{const e=document.querySelector("#startGameButton");e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})()');
      assert.ok(rect.left >= 0 && rect.right <= width && rect.top >= 0 && rect.bottom <= height);
      await shot(`menu-controls-${width}x${height}.png`);
      await evaluate('document.querySelector("#menuOverlay").scrollTop=0');
    }
    report.push(`Sem overflow horizontal: ${width}×${height}`);
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".introOrbit ellipse")).animationName'), 'none');
  report.push('Preferência de movimento reduzido respeitada');
  await writeFile(join(output, layoutOnly ? 'layout-report.json' : 'report.json'), JSON.stringify({ checks: report, ready3D: ready, errors, dimensions }, null, 2));
  assert.deepEqual(errors, []);
  assert.equal(ready, true, 'Os recursos 3D precisam carregar para a integração ser considerada aprovada.');
  console.log('PASS: integração concluída; capturas em', output);
  }
} catch(error){
  if(socket?.readyState === 1){
    try { console.log('Estado:', await evaluate('({selectedSong,running,preRolling,menuStatus:document.querySelector("#menuStatus").textContent})')); await shot('failure.png'); } catch {}
  }
  await writeFile(join(output, 'failure.json'), JSON.stringify({ checks: report, errors, failure: error.stack }, null, 2));
  throw error;
} finally {
  if(socket?.readyState === 1){ try { await send('Browser.close'); } catch {} }
  socket?.close();
  chrome.kill(); vite.kill();
}
