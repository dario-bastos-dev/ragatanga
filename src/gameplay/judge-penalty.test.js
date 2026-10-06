// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  describe,
  it,
  expect,
  vi,
  beforeAll
} from 'vitest';

/* Mesma configuração do jogo, mas com outra penalidade de MISS. */
vi.mock('../config/gameplay.js', async importOriginal => ({
  ...await importOriginal(),
  MISS_PENALTY: 30
}));

vi.mock('../audio/music.js', () => ({
  gameTime: () => 0
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

  judge = await import('./judge.js');
  ({ makePlayer } = await import('./players.js'));

});

describe('texto de MISS', () => {

  it('mostra a penalidade configurada quando a nota passa sem ser tocada', () => {
    const player = makePlayer(
      'p1',
      ['A', 'W', 'S', 'D'],
      'notesP1',
      {
        regular: [{ time: 10, p1: 0, p2: 1 }],
        special: []
      }
    );

    judge.resolvePassedNote(player, player.notes[0]);

    expect(document.querySelector('#judgeP1').textContent).toBe('MISS -30');
  });

});
