import { test } from 'node:test';
import assert from 'node:assert/strict';

function installContext(t, value){
  const original = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { value, configurable: true });
  t.after(() => original ? Object.defineProperty(globalThis, 'AudioContext', original) : delete globalThis.AudioContext);
}

test('analisador cria uma fonte e uma rota audível, sem fechar o contexto', async t => {
  let sourceCount = 0;
  const destinations = [];
  const output = {};
  const analysis = { frequencyBinCount: 512, getFloatFrequencyData: bins => bins.fill(-50) };
  installContext(t, class {
    state = 'suspended'; sampleRate = 48000; destination = output;
    async resume(){ this.state = 'running'; }
    createMediaElementSource(){ sourceCount++; return { connect: node => destinations.push(node) }; }
    createAnalyser(){ return analysis; }
  });
  const m = await import('../src/audio/intro-reactivity.js?test=single-route');
  const media = { paused: false, muted: false, volume: .03 };
  await Promise.all([m.prepareThemeAnalysis(media), m.prepareThemeAnalysis(media)]);
  await m.prepareThemeAnalysis(media);
  assert.equal(sourceCount, 1);
  assert.equal(destinations.filter(x => x === output).length, 1);
  assert.equal(destinations.filter(x => x === analysis).length, 1);
  assert.ok(m.sampleThemeBass() > 0);
  media.paused = true;
  assert.equal(m.sampleThemeBass(), null);
  media.paused = false; media.volume = 0;
  assert.equal(m.sampleThemeBass(), null);
  assert.equal(m.getThemeAnalysisState().connected, true);
});

test('contexto bloqueado não redireciona nem silencia o áudio nativo', async t => {
  let connected = false;
  installContext(t, class {
    state = 'suspended';
    async resume(){ throw new Error('Autoplay bloqueado'); }
    createMediaElementSource(){ connected = true; }
  });
  const m = await import('../src/audio/intro-reactivity.js?test=blocked');
  await m.prepareThemeAnalysis({ paused: false });
  assert.equal(connected, false);
  assert.equal(m.getThemeAnalysisState().mode, 'fallback');
  assert.equal(m.sampleThemeBass(), null);
});

test('falha do analisador preserva a conexão audível já estabelecida', async t => {
  let audible = 0;
  installContext(t, class {
    state = 'running'; destination = {};
    async resume(){}
    createMediaElementSource(){ return { connect(){ audible++; } }; }
    createAnalyser(){ throw new Error('Sem analisador'); }
  });
  const m = await import('../src/audio/intro-reactivity.js?test=analysis-failure');
  await m.prepareThemeAnalysis({ paused: false });
  assert.equal(audible, 1);
  assert.equal(m.getThemeAnalysisState().connected, true);
  assert.equal(m.getThemeAnalysisState().mode, 'fallback');
});
