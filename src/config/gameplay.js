export const P1_MODEL_URL =
  'https://threejs.org/examples/models/fbx/Samba%20Dancing.fbx';

export const DEFEAT_ANIMATION_URL =
  './assets/animations/dying.fbx';

export const VICTORY_ANIMATION_URL =
  './assets/animations/laughing.fbx';

export const MENU_IDLE_ANIMATION_URL =
  './assets/animations/zombie-idle.fbx';

export const VICTORY_SOUND_URL =
  './assets/audio/you-dance-victory-7s.mp3';

export const CROWD_CELEBRATION_SOUND_URL =
  './assets/audio/ui/crowd-celebration.mp3';

export const MENU_THEME_SOUND_URL =
  './assets/audio/ui/menu-theme-love-me-again.mp3';

export const MENU_THEME_VOLUME = .03;

export const MENU_SELECT_SOUND_URL =
  './assets/audio/ui/menu-select.mp3';

export const PAUSE_SOUND_URL =
  './assets/audio/ui/pause.mp3';

export const START_DANCE_SOUND_URL =
  './assets/audio/ui/start-dance.mp3';

export const WASTED_SOUND_URL =
  './assets/audio/ui/wasted.mp3';

export const PRE_MATCH_ANIMATION_URLS = {
  p1: './assets/animations/shooting-arrow.fbx',
  p2: './assets/animations/punching-bag.fbx'
};

export const COMPLETION_ANIMATION_URLS = {
  p1: './assets/animations/bboy-hip-hop-move.fbx',
  p2: './assets/animations/hip-hop-dancing.fbx'
};

export const THRILLER_CHARACTER_URLS = {
  p1: './assets/characters/michael-thriller/MJ_THRILLER.fbx',
  p2: './assets/characters/zombie-girl.fbx'
};

/*
  Skins por música. `textures` aponta a pasta das imagens quando o FBX não
  as embute e as referencia por um caminho que não existe no jogo.
*/
export const SONG_CHARACTERS = {
  ragatanga: {
    label: 'Homem-Aranha',
    p1: {
      url: './assets/characters/ragatanga/the-amazing-spider-man-2-spider-man/source/the-amazing-spider-man-2-rigged-model/source/Amazing Spider Man 2 Rigged.fbx'
    },
    p2: {
      url: './assets/characters/ragatanga/spider-man-far-from-home-stealth-suit/source/STEALTH SUIT.fbx',
      textures: './assets/characters/ragatanga/spider-man-far-from-home-stealth-suit/textures/'
    }
  },

  macarena: {
    label: 'Deadpool',
    p1: {
      url: './assets/characters/macarena/dead-pool/source/DeadPool.fbx'
    },
    /*
      O FBX da Lady Deadpool vem com adereços do jogo de origem
      (helicóptero, escada, bombas, bazuca e katanas reserva soltas).
      Ficam só o corpo e as katanas das costas.
    */
    p2: {
      url: './assets/characters/macarena/lady-deadpooltexturedrigged/source/hero_deadpool01_S02.fbx',
      textures: './assets/characters/macarena/lady-deadpooltexturedrigged/textures/',
      textureFiles: [
        'hero_deadpool01_s02_01.png',
        'hero_deadpool01_s02_02.png'
      ],
      keepMeshes: ['hero_deadpool01_s02'],
      removeBones: [
        'sword_Bone001',
        'sword_Bone002',
        'sword_Bone005',
        'sword_Bone006'
      ]
    }
  },

  ymca: {
    label: 'Heathers e Pete',
    /* O FBX chega num quadro da dança embutida; a pose de bind é a T-pose. */
    p1: {
      url: './assets/characters/ymca/heathers-ymca/source/Heather 001 YMCA.fbx',
      restoreBindPose: true
    },
    p2: {
      url: './assets/characters/ymca/pete/source/Ymca Dance.fbx'
    }
  }
};

export const COMPLETION_CELEBRATION_SECONDS = 7;

export const WASTED_REVEAL_SECONDS = 2;

export const WASTED_SEQUENCE_SECONDS = 5.35;

export const PRE_ROLL_SECONDS = 3;

export const PRE_ROLL_VISUAL_SPEED_MULTIPLIER = 1.85;

export const PRE_ROLL_MAX_Y = 74;

export const DANCE_BANNER_MS = 520;

export const MENU_PREVIEW_SECONDS = 10;

export const MENU_PREVIEW_VOLUME = .22;

export const MENU_ANIMATION_FADE_SECONDS = .65;

export const MENU_CHARACTER_X = -158;

export const P1_KEYS = ['A','W','S','D'];

export const P2_KEYS = [
  'ArrowLeft',
  'ArrowUp',
  'ArrowDown',
  'ArrowRight'
];

export const P2_LABELS = ['←','↑','↓','→'];

export const LANE_X = [12.5,37.5,62.5,87.5];

export const DANCE_FADE = .25;

export const NORMAL_TARGET_Y = 82;

export const SPAWN_Y = -12;

export const MISS_PENALTY = 50;

export const SPECIAL_SCORE = 150;

export const HIT = {
  perfect: .070,
  great: .140,
  good: .220
};

export const MISS_SOUND_URLS = [
  './assets/audio/miss/miss-1.mp3',
  './assets/audio/miss/miss-2.mp3',
  './assets/audio/miss/miss-3.mp3',
  './assets/audio/miss/miss-4.mp3',
  './assets/audio/miss/miss-5.mp3',
  './assets/audio/miss/miss-6.mp3'
];
