export const CHARACTER_MODEL_URL =
  'https://threejs.org/examples/models/fbx/Samba%20Dancing.fbx';

/* Altura do personagem em cena (unidades da cena ≈ cm). */
export const CHARACTER_HEIGHT = 175;

export const P1_KEYS = ['A','W','S','D'];

export const P2_KEYS = [
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight'
];

export const P2_LABELS = ['↑','←','↓','→'];

/* Posição horizontal (%) de cada coluna; no EXTREMO há a 5ª coluna. */
export const LANE_X = [12.5,37.5,62.5,87.5];
export const EXTREME_LANE_X = [10,30,50,70];
export const SPECIAL_LANE_X = 90;

/* Posição vertical (%) das notas na pista. */
export const NORMAL_TARGET_Y = 82;
export const SPAWN_Y = -12;

export const MISS_PENALTY = 50;
export const SPECIAL_SCORE = 150;

/* Janelas de acerto, em segundos. */
export const HIT = {
  perfect: .070,
  great: .140,
  good: .220
};

/* Tempo de fade entre idle e coreografia ao errar/acertar. */
export const DANCE_FADE = .25;
