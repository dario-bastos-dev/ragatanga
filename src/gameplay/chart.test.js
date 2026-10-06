import {
  describe,
  it,
  expect,
  beforeEach
} from 'vitest';

import {
  SONGS
} from '../config/songs.js';

import {
  DIFFICULTIES
} from '../config/difficulties.js';

import {
  state
} from '../core/state.js';

import {
  buildDifficultyEvents
} from './chart.js';

function useSong(id, difficulty){

  state.songId = id;
  state.beatmap = SONGS[id].beatmap;
  state.difficulty = difficulty;

}

beforeEach(() => {
  useSong('ragatanga', 'normal');
});

describe('buildDifficultyEvents', () => {

  it('gera sempre a mesma sequência para a mesma música (semente fixa)', () => {
    const first = buildDifficultyEvents();
    const second = buildDifficultyEvents();

    expect(second).toEqual(first);
  });

  it('mantém a sequência do Ragatanga no NORMAL (as notas não mudam sem querer)', () => {
    const lanes = buildDifficultyEvents()
      .regular
      .slice(0, 8)
      .map(event => [event.p1, event.p2]);

    expect(lanes).toMatchInlineSnapshot(`
      [
        [
          3,
          0,
        ],
        [
          2,
          3,
        ],
        [
          3,
          1,
        ],
        [
          2,
          0,
        ],
        [
          3,
          1,
        ],
        [
          1,
          2,
        ],
        [
          2,
          0,
        ],
        [
          0,
          1,
        ],
      ]
    `);
  });

  it('músicas diferentes geram sequências diferentes', () => {
    const ragatanga = buildDifficultyEvents().regular.map(event => event.p1);

    useSong('thriller', 'normal');

    const thriller = buildDifficultyEvents().regular.map(event => event.p1);

    expect(thriller.slice(0, 16)).not.toEqual(ragatanga.slice(0, 16));
  });

  for(const songId of Object.keys(SONGS)){
    for(const [difficultyId, difficulty] of Object.entries(DIFFICULTIES)){

      describe(`${songId} · ${difficultyId}`, () => {

        beforeEach(() => {
          useSong(songId, difficultyId);
        });

        it('cria uma nota a cada beatStep batidas, no tempo da batida', () => {
          const { beats } = SONGS[songId].beatmap;
          const { regular } = buildDifficultyEvents();

          expect(regular).toHaveLength(Math.ceil(beats.length / difficulty.beatStep));

          regular.forEach((event, index) => {
            expect(event.time).toBe(beats[index * difficulty.beatStep]);
          });
        });

        it('usa colunas de 0 a 3 e nunca a mesma coluna para P1 e P2 no mesmo instante', () => {
          for(const event of buildDifficultyEvents().regular){
            expect([0, 1, 2, 3]).toContain(event.p1);
            expect([0, 1, 2, 3]).toContain(event.p2);
            expect(event.p2).not.toBe(event.p1);
          }
        });

        it(
          difficulty.special
            ? 'põe um especial no meio da batida a cada 8 batidas'
            : 'não gera especiais',
          () => {
            const { beats } = SONGS[songId].beatmap;
            const { special } = buildDifficultyEvents();

            if(!difficulty.special){
              expect(special).toEqual([]);
              return;
            }

            const expected = [];

            for(let i = 7; i < beats.length - 1; i += 8){
              expected.push((beats[i] + beats[i + 1]) / 2);
            }

            expect(special.map(event => event.time)).toEqual(expected);
          }
        );

      });

    }
  }

});
