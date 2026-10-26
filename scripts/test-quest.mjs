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
