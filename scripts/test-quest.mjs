import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectQuest, getRenderProfile } from '../src/platform/quest.js';
import { laneFromPoint } from '../src/gameplay/pointer-input.js';
import { gamepadActions } from '../src/gameplay/gamepad-input.js';

const QUEST_3 = 'Mozilla/5.0 (X11; Linux x86_64; Quest 3) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/39.2.0.0.56.754450099 Chrome/136.0.7103.177 VR Safari/537.36';
const QUEST_2_MOBILE = 'Mozilla/5.0 (Linux; Android 12; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0.0.0 SamsungBrowser/4.0 Chrome/126.0.0.0 Mobile VR Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

test('detecta o Quest Browser pelo user-agent, inclusive no modo mobile', () => {
  assert.equal(detectQuest({ userAgent: QUEST_3, search: '' }), true);
  assert.equal(detectQuest({ userAgent: QUEST_2_MOBILE, search: '' }), true);
  assert.equal(detectQuest({ userAgent: DESKTOP, search: '' }), false);
});

test('a palavra "Quest" sem o token OculusBrowser não liga o modo Quest', () => {
  const webviewDesktop = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Quest/2.1';
  assert.equal(detectQuest({ userAgent: webviewDesktop, search: '' }), false);
});

test('?quest=1 e ?quest=0 forçam o modo para testes', () => {
  assert.equal(detectQuest({ userAgent: DESKTOP, search: '?quest=1' }), true);
  assert.equal(detectQuest({ userAgent: QUEST_3, search: '?quest=0' }), false);
});

test('perfil de renderização do Quest é mais leve', () => {
  assert.deepEqual(getRenderProfile(true), { maxPixelRatio: 1, softShadows: false });
  assert.deepEqual(getRenderProfile(false), { maxPixelRatio: 2, softShadows: true });
});

test('ponteiro escolhe a pista sob o laser ou a mais próxima', () => {
  const rects = [0, 1, 2, 3].map(i => ({ left: i * 50, right: i * 50 + 44, width: 44 }));
  assert.equal(laneFromPoint(10, rects), 0);
  assert.equal(laneFromPoint(160, rects), 3);
  assert.equal(laneFromPoint(46, rects), 0);
  assert.equal(laneFromPoint(49, rects), 1);
  const hiddenSpecial = { left: 0, right: 0, width: 0 };
  assert.equal(laneFromPoint(500, [...rects, hiddenSpecial]), 3);
  assert.equal(laneFromPoint(230, [...rects, { left: 200, right: 244, width: 44 }]), 4);
});

test('gamepad dispara só na borda de pressionamento', () => {
  const pressed = Array(17).fill(false);
  pressed[14] = true; // direcional ←
  pressed[3] = true;  // Y → pista ↑
  pressed[7] = true;  // RT → especial
  assert.deepEqual(gamepadActions(pressed), [0, 1, 'special']);
  assert.deepEqual(gamepadActions(pressed, pressed), []);
  const start = Array(17).fill(false);
  start[9] = true;
  assert.deepEqual(gamepadActions(start), ['pause']);
});

/*
  Simula a Gamepad API: eventos de conexão, quadros de requestAnimationFrame e
  a lista de getGamepads(). Cada teste importa uma instância nova do módulo.
*/
async function gamepadHarness(t){
  const listeners = new Map();
  const frames = [];
  const presses = [];
  const state = { pads: [] };
  const install = (key, value) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  };
  install('addEventListener', (name, fn) => listeners.set(name, fn));
  install('requestAnimationFrame', fn => frames.push(fn));
  install('navigator', { getGamepads: () => state.pads });
  install('pressPlayerLane', (player, lane) => presses.push([player, lane]));
  install('togglePause', () => presses.push(['pause']));
  const { initGamepadInput } = await import(`../src/gameplay/gamepad-input.js?instancia=${Math.random()}`);
  initGamepadInput();
  const pad = (index, ...pressedButtons) => ({
    index,
    connected: true,
    mapping: 'standard',
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressedButtons.includes(i) }))
  });
  return {
    presses,
    state,
    pad,
    emit: (name, index = 0) => listeners.get(name)?.({ gamepad: { index } }),
    frame(){ const fn = frames.shift(); fn?.(); return Boolean(fn); },
    pendingFrames: () => frames.length
  };
}

test('gamepad volta a responder depois de a lista ficar vazia por um instante', async t => {
  const gp = await gamepadHarness(t);
  gp.emit('gamepadconnected');
  gp.state.pads = [];            // ex.: menu do sistema do Quest tirou o foco
  gp.frame();
  assert.equal(gp.pendingFrames(), 1, 'o polling deve continuar com o controle conectado');
  gp.state.pads = [gp.pad(0, 14)];  // direcional ← de volta
  gp.frame();
  assert.deepEqual(gp.presses, [['p1', 0]]);
});

test('polling para quando o último controle desconecta', async t => {
  const gp = await gamepadHarness(t);
  gp.emit('gamepadconnected');
  gp.state.pads = [gp.pad(0)];
  gp.frame();
  gp.emit('gamepaddisconnected');
  gp.state.pads = [];
  gp.frame();
  assert.equal(gp.pendingFrames(), 0);
  gp.emit('gamepadconnected');
  assert.equal(gp.pendingFrames(), 1, 'reconectar reinicia o polling');
});

test('cada controle mantém seu jogador quando o outro desconecta', async t => {
  const gp = await gamepadHarness(t);
  gp.emit('gamepadconnected', 0);
  gp.emit('gamepadconnected', 1);
  gp.state.pads = [gp.pad(0), gp.pad(1)];
  gp.frame();
  gp.state.pads = [gp.pad(0), gp.pad(1, 14)];
  gp.frame();
  assert.deepEqual(gp.presses, [['p2', 0]]);

  gp.emit('gamepaddisconnected', 0);  // controle do P1 sai no meio da partida
  gp.state.pads = [gp.pad(1)];
  gp.frame();
  gp.state.pads = [gp.pad(1, 12)];
  gp.frame();
  assert.deepEqual(gp.presses.at(-1), ['p2', 1], 'o controle do P2 não pode virar P1');

  gp.emit('gamepadconnected', 2);     // quem chega depois ocupa a vaga livre
  gp.state.pads = [gp.pad(1), gp.pad(2, 15)];
  gp.frame();
  assert.deepEqual(gp.presses.at(-1), ['p1', 3]);
});

test('terceiro controle não toca nas pistas, mas o Start dele pausa', async t => {
  const gp = await gamepadHarness(t);
  for(const index of [0, 1, 2]) gp.emit('gamepadconnected', index);
  gp.state.pads = [gp.pad(0), gp.pad(1), gp.pad(2)];
  gp.frame();
  gp.state.pads = [gp.pad(0), gp.pad(1), gp.pad(2, 14, 9)];
  gp.frame();
  assert.deepEqual(gp.presses, [['pause']]);
});
