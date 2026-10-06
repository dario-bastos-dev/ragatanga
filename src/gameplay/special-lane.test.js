// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterAll
} from 'vitest';

import {
  DIFFICULTIES
} from '../config/difficulties.js';

import {
  EXTREME_LANE_X
} from '../config/gameplay.js';

import {
  state
} from '../core/state.js';

/* Relógio da partida controlado pelo teste. */
let now = 0;

vi.mock('../audio/music.js', () => ({
  gameTime: () => now
}));

/*
  Dificuldade com a 5ª pista (especiais) mas com outro nome:
  o que decide o modo é a flag `special`, não o id 'extreme'.
*/
const SPECIAL_DIFFICULTY = 'teste-especial';

let makePlayer;
let updatePlayerNotes;
let showMatchHud;

beforeAll(async () => {

  const html =
    readFileSync(
      resolve(process.cwd(), 'index.html'),
      'utf8'
    );

  document.documentElement.innerHTML =
    html.replace(/<!doctype html>/i, '');

  DIFFICULTIES[SPECIAL_DIFFICULTY] = {
    ...DIFFICULTIES.extreme,
    label: 'TESTE'
  };

  ({ makePlayer } = await import('./players.js'));
  ({ updatePlayerNotes } = await import('./notes.js'));
  ({ showMatchHud } = await import('../ui/hud.js'));

  const { initInput } = await import('./input.js');

  initInput();

});

afterAll(() => {
  delete DIFFICULTIES[SPECIAL_DIFFICULTY];
});

let player;

beforeEach(() => {

  state.difficulty = SPECIAL_DIFFICULTY;
  state.mode = 1;

  /* Uma nota na coluna 0 e um especial (X), ambos aos 10 s. */
  player = makePlayer(
    'p1',
    ['A', 'W', 'S', 'D'],
    'notesP1',
    {
      regular: [{ time: 10, p1: 0, p2: 1 }],
      special: [{ time: 10, order: 0 }]
    }
  );

  state.players.p1 = player;

});

describe('dificuldade com pista especial (flag special)', () => {

  it('posiciona as notas no layout de 5 colunas', () => {
    expect(player.notes[0].element.style.left).toBe(EXTREME_LANE_X[0] + '%');
  });

  it('faz os especiais descerem pela pista', () => {
    updatePlayerNotes(player, 9.5, false);

    expect(player.specials[0].element.style.display).toBe('grid');
  });

  it('aceita a tecla X como acerto de especial', () => {
    state.running = true;
    now = 10;

    dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));

    state.running = false;

    expect(player.results.special).toBe(1);
  });

  it('mostra o HUD com a 5ª pista', () => {
    showMatchHud();

    expect(document.body.classList.contains('extreme')).toBe(true);
  });

});
