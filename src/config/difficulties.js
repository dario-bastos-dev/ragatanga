/*
  A velocidade abaixo controla o TEMPO DE VIAGEM.
  Menor tempo = nota cai mais rápido.

  EXTREMO usa 1,8 s: continua claramente mais rápido que o Difícil,
  mas permanece jogável para quem já tem prática.
*/
export const DIFFICULTIES = {
  easy: {
    label: 'FÁCIL',
    beatStep: 4,
    travelTime: 3.5,
    description: '1 a cada 4 batidas · lento',
    special: false
  },

  normal: {
    label: 'NORMAL',
    beatStep: 2,
    travelTime: 2.8,
    description: '1 a cada 2 batidas · normal',
    special: false
  },

  hard: {
    label: 'DIFÍCIL',
    beatStep: 1,
    travelTime: 2.2,
    description: 'todas as batidas · rápido',
    special: false
  },

  extreme: {
    label: 'EXTREMO',
    beatStep: 1,
    travelTime: 1.8,
    description: 'todas as batidas + especial · rápido',
    special: true
  }
};

export const DEFAULT_DIFFICULTY = 'normal';
