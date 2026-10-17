export const DIFFICULTIES = {
  easy: {
    label: 'FÁCIL',
    beatStep: 4,
    travelTime: 3.5,
    description: '1 a cada 4 batidas · lento',
    special: false,
    missLimit: 10
  },

  normal: {
    label: 'NORMAL',
    beatStep: 2,
    travelTime: 2.8,
    description: '1 a cada 2 batidas · normal',
    special: false,
    missLimit: 15
  },

  hard: {
    label: 'DIFÍCIL',
    beatStep: 1,
    travelTime: 2.2,
    description: 'todas as batidas · rápido',
    special: false,
    missLimit: 20
  },

  extreme: {
    label: 'EXTREMO',
    beatStep: 1,
    travelTime: 1.8,
    description: 'todas as batidas + especial · rápido',
    special: true,
    missLimit: 25
  }
};

export const DEFAULT_DIFFICULTY = 'easy';
