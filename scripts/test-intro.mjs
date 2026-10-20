import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initIntro } from '../src/ui/intro.js';
import { coverTransform } from '../src/ui/intro-show.js';

function harness(t, reducedMotion = false){
  const listeners = new Map();
  const target = name => ({
    addEventListener(event, fn){ listeners.set(name + ':' + event, fn); },
    removeEventListener(event){ listeners.delete(name + ':' + event); }
  });
  const classes = new Set(['intro-pending']);
  let flight;
  let plays = 0, stops = 0, entries = 0;
  const logo = {
    getBoundingClientRect: () => ({ x: 300, y: 250, width: 1000, height: 335 }),
    animate(){ flight = { cancel(){}, currentTime: 0 }; return flight; }
  };
  const overlay = { ...target('overlay'), focus(){}, querySelector: () => logo, classList: { add(){} } };
  const button = { ...target('button'), focus(){} };
  const menu = {
    inert: true, removeAttribute(){},
    querySelector: selector => selector === '.menuHeroLogo'
      ? { getBoundingClientRect: () => ({ x: 190, y: 30, width: 420, height: 140.7 }) }
      : { focus(){} }
  };
  const mediaQuery = { ...target('motion'), matches: reducedMotion };
  t.mock.method(globalThis, 'setTimeout', fn => { listeners.set('timeout', fn); return 1; });
  t.mock.method(globalThis, 'clearTimeout', () => listeners.delete('timeout'));
  const install = (key, value) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
  };
  install('document', { ...target('document'), hidden: false, body: { classList: {
    add: (...names) => names.forEach(n => classes.add(n)),
    remove: (...names) => names.forEach(n => classes.delete(n))
  } }, querySelector: selector => ({ '#introOverlay': overlay, '#introStart': button, '#menuOverlay': menu })[selector] });
  install('window', target('window'));
  install('matchMedia', () => mediaQuery);
  install('resumeMenuThemeMusic', () => plays++);
  install('enterInitialMenu', () => entries++);
  initIntro({ createShow: () => ({ activate(){}, impact(){}, stop(){ stops++; } }) });
  const key = repeat => listeners.get('window:keydown')({ key: 'Enter', repeat, preventDefault(){}, stopImmediatePropagation(){} });
  return { key, listeners, overlay, menu, button, classes, get flight(){ return flight; }, state: () => ({ plays, stops, entries }) };
}

test('Enter único, menu bloqueado até terminar, limpeza e transferência da logo', t => {
  const h = harness(t);
  h.key(true);
  assert.equal(h.state().plays, 0);
  h.key(false); h.key(false);
  assert.equal(h.state().plays, 1);
  assert.equal(h.menu.inert, true);
  assert.equal(h.button.disabled, true);
  assert.equal(h.classes.has('intro-revealing'), true);
  h.flight.onfinish();
  assert.equal(h.menu.inert, false);
  assert.equal(h.overlay.hidden, true);
  assert.equal(h.classes.size, 0);
  assert.deepEqual(h.state(), { plays: 1, stops: 1, entries: 1 });
  assert.equal(h.listeners.size, 0);
});

test('fallback libera a abertura sem evento de animação', t => {
  const h = harness(t);
  h.key(false);
  h.listeners.get('timeout')();
  assert.equal(h.overlay.hidden, true);
  assert.equal(h.state().entries, 1);
});

test('movimento reduzido evita deslocar a logo', t => {
  const h = harness(t, true);
  h.key(false);
  assert.equal(h.flight, undefined);
  h.listeners.get('timeout')();
  assert.equal(h.menu.inert, false);
});

test('redimensionamento recalcula a trajetória sem iniciar outra entrada', t => {
  const h = harness(t);
  h.key(false);
  const first = h.flight;
  h.listeners.get('window:resize')();
  assert.notEqual(h.flight, first);
  h.flight.onfinish();
  assert.equal(h.state().entries, 1);
});

test('camadas seguem exatamente o cover centralizado em desktop e retrato', () => {
  for(const [w,h] of [[1600,900],[1366,768],[390,844],[900,900]]){
    const { scale,x,y } = coverTransform(w,h);
    assert.ok(scale * 1672 >= w - .001);
    assert.ok(scale * 941 >= h - .001);
    assert.ok(Math.abs(x + scale * 1672 / 2 - w / 2) < .001);
    assert.ok(Math.abs(y + scale * 941 / 2 - h / 2) < .001);
  }
});
