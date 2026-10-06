import {
  describe,
  it,
  expect
} from 'vitest';

import {
  RECENT_MATCH_LIMIT,
  loadRecentMatches,
  rankPerformances,
  recordMatch
} from './leaderboard.js';

function createStorage(
  initialValue = null
){

  const values = new Map();

  if(initialValue !== null){
    values.set(
      'ragatanga.recent-matches.v1',
      initialValue
    );
  }

  return {
    getItem: key =>
      values.has(key)
        ? values.get(key)
        : null,
    setItem: (key, value) =>
      values.set(key, value)
  };

}

function makeMatch(
  score,
  playedAt = '2026-01-01T00:00:00.000Z'
){

  return {
    songId: 'ragatanga',
    difficulty: 'normal',
    mode: 1,
    playedAt,
    players: [
      {
        id: 'P1',
        score
      }
    ]
  };

}

describe('histórico do ranking', () => {

  it('persiste as partidas mais recentes e limita o histórico a dez', () => {

    const storage =
      createStorage(
        JSON.stringify(
          Array.from(
            { length: RECENT_MATCH_LIMIT },
            (_, index) => {
              const day =
                RECENT_MATCH_LIMIT - index;

              return makeMatch(
                day,
                `2026-01-${String(day).padStart(2, '0')}T00:00:00.000Z`
              );
            }
          )
        )
      );

    const matches =
      recordMatch(
        {
          songId: 'thriller',
          difficulty: 'hard',
          mode: 1,
          players: [
            {
              id: 'P1',
              score: 500
            }
          ]
        },
        storage
      );

    expect(matches).toHaveLength(RECENT_MATCH_LIMIT);
    expect(matches[0].songId).toBe('thriller');
    expect(matches[RECENT_MATCH_LIMIT - 1].players[0].score).toBe(2);
    expect(loadRecentMatches(storage)).toEqual(matches);

  });

  it('ordena pontuações em ordem decrescente e inclui jogadores individualmente', () => {

    const ranked =
      rankPerformances([
        {
          ...makeMatch(100),
          mode: 2,
          players: [
            {
              id: 'P1',
              score: 100
            },
            {
              id: 'P2',
              score: 250
            }
          ]
        },
        makeMatch(
          300,
          '2026-01-02T00:00:00.000Z'
        )
      ]);

    expect(
      ranked.map(
        performance => performance.score
      )
    ).toEqual([300, 250, 100]);

    expect(ranked[1]).toMatchObject({
      id: 'P2',
      mode: 2
    });

  });

  it('falha explicitamente ao ler um histórico inválido', () => {

    const storage =
      createStorage('{"not":"a list"}');

    expect(
      () => loadRecentMatches(storage)
    ).toThrow('O histórico de partidas salvo é inválido.');

  });

});
