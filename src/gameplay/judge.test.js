// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach
} from 'vitest';

/* Relógio da partida controlado pelo teste. */
let now = 0;

vi.mock('../audio/music.js', () => ({
  gameTime: () => now
}));

let judge;
let makePlayer;

beforeAll(async () => {

  const html =
    readFileSync(
      resolve(process.cwd(), 'index.html'),
      'utf8'
    );

  document.documentElement.innerHTML =
    html.replace(/<!doctype html>/i, '');

  /* HUD e jogadores leem o DOM ao serem importados. */
  judge = await import('./judge.js');
  ({ makePlayer } = await import('./players.js'));

});

let player;

/* P1 com uma nota na coluna 0 (tecla A) aos 10 s. */
beforeEach(() => {

  player = makePlayer(
    'p1',
    ['A', 'W', 'S', 'D'],
    'notesP1',
    {
      regular: [{ time: 10, p1: 0, p2: 1 }],
      special: []
    }
  );

});

function judgementText(){
  return document.querySelector('#judgeP1').textContent;
}

describe('julgamento de uma tecla', () => {

  it('dá PERFECT (+100) até 70 ms da nota', () => {
    now = 10.05;

    judge.handleInput(player, 'A');

    expect(player.score).toBe(100);
    expect(player.results.perfect).toBe(1);
    expect(judgementText()).toBe('PERFECT +100');
  });

  it('dá GREAT (+75) entre 70 e 140 ms', () => {
    now = 9.9;

    judge.handleInput(player, 'A');

    expect(player.score).toBe(75);
    expect(player.results.great).toBe(1);
  });

  it('dá GOOD (+50) entre 140 e 220 ms', () => {
    now = 10.2;

    judge.handleInput(player, 'A');

    expect(player.score).toBe(50);
    expect(player.results.good).toBe(1);
  });

  it('soma combo e guarda o maior combo a cada acerto', () => {
    player = makePlayer(
      'p1',
      ['A', 'W', 'S', 'D'],
      'notesP1',
      {
        regular: [
          { time: 10, p1: 0, p2: 1 },
          { time: 11, p1: 0, p2: 1 }
        ],
        special: []
      }
    );

    now = 10;
    judge.handleInput(player, 'A');
    now = 11;
    judge.handleInput(player, 'A');

    expect(player.combo).toBe(2);
    expect(player.maxCombo).toBe(2);
    expect(player.notes.every(note => note.resolved)).toBe(true);
  });

  it('marca MISS • CEDO quando a tecla vem antes da janela de acerto', () => {
    now = 9.6;

    judge.handleInput(player, 'A');

    expect(player.results.miss).toBe(1);
    expect(judgementText()).toBe('MISS • CEDO -50');
    expect(player.notes[0].resolved).toBe(false);
  });

  it('marca MISS • TARDE quando a tecla vem depois da janela de acerto', () => {
    now = 10.4;

    judge.handleInput(player, 'A');

    expect(judgementText()).toBe('MISS • TARDE -50');
  });

  it('marca MISS quando não há nota daquela tecla por perto', () => {
    now = 10;

    judge.handleInput(player, 'W');

    expect(player.results.miss).toBe(1);
    expect(judgementText()).toBe('MISS -50');
  });

  it('zera o combo no erro e nunca deixa a pontuação negativa', () => {
    player.combo = 5;

    now = 10;
    judge.handleInput(player, 'W');

    expect(player.combo).toBe(0);
    expect(player.score).toBe(0);
  });

});

describe('nota que passou sem ser tocada', () => {

  it('vira MISS e desconta 50 pontos', () => {
    player.score = 200;

    judge.resolvePassedNote(player, player.notes[0]);

    expect(player.score).toBe(150);
    expect(player.results.miss).toBe(1);
    expect(player.notes[0].resolved).toBe(true);
  });

});
