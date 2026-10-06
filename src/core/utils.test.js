import {
  describe,
  it,
  expect
} from 'vitest';

import {
  beatPosition
} from './utils.js';

/* Batidas a cada 0,5 s, a partir de 1 s. */
const beats = [1, 1.5, 2, 2.5];

describe('beatPosition', () => {

  it('é 0 na primeira batida e 3 na última', () => {
    expect(beatPosition(beats, 1)).toBe(0);
    expect(beatPosition(beats, 2.5)).toBe(3);
  });

  it('interpola entre duas batidas', () => {
    expect(beatPosition(beats, 1.25)).toBeCloseTo(0.5);
    expect(beatPosition(beats, 2.125)).toBeCloseTo(2.25);
  });

  it('acompanha batidas com intervalos diferentes (andamento variável)', () => {
    const uneven = [0, 0.5, 1.5];

    expect(beatPosition(uneven, 1)).toBeCloseTo(1.5);
  });

  it('extrapola antes da primeira batida com o primeiro intervalo', () => {
    expect(beatPosition(beats, 0.5)).toBeCloseTo(-1);
  });

  it('extrapola depois da última batida com o último intervalo', () => {
    expect(beatPosition(beats, 3.5)).toBeCloseTo(5);
  });

});
