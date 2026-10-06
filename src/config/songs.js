import ragatangaBeatmap
  from '../beatmaps/ragatanga.json';

import thrillerBeatmap
  from '../beatmaps/thriller.json';

import ymcaBeatmap
  from '../beatmaps/ymca.json';

import macarenaBeatmap
  from '../beatmaps/macarena.json';

/*
  Cada música traz seu beatmap, o arquivo de áudio e as sementes
  que definem a coreografia (sequência de notas) de cada jogador.
  A janela de áudio (audioStart/audioEnd) vem do próprio beatmap.

  dance (opcional): arquivo com os clips "dance" e "idle" da coreografia
  (gerado por scripts/build-dance.mjs). Sem ele, a música usa o clip
  Samba Dancing do FBX.

  danceBeats (opcional): o clip vira um loop de N batidas que segue as
  batidas do beatmap (acelera e desacelera junto com a música). Sem ele,
  o clip segue o relógio da partida.
*/
export const SONGS = {
  ragatanga: {
    title: 'RAGATANGA',
    audio: './assets/audio/ragatanga.mp3',
    beatmap: ragatangaBeatmap,
    seedP1: 104729,
    seedP2: 130363
  },

  thriller: {
    title: 'THRILLER',
    audio: './assets/audio/thriller.mp3',
    beatmap: thrillerBeatmap,
    seedP1: 7919,
    seedP2: 15485863,
    dance: './assets/animations/thriller.json'
  },

  ymca: {
    title: 'YMCA',
    audio: './assets/audio/ymca.mp3',
    beatmap: ymcaBeatmap,
    seedP1: 27644437,
    seedP2: 49979687,
    dance: './assets/animations/ymca.json',
    danceBeats: 10
  },

  /* Os 16 tempos da Macarena = 16 batidas (4 compassos). */
  macarena: {
    title: 'MACARENA',
    audio: './assets/audio/macarena.mp3',
    beatmap: macarenaBeatmap,
    seedP1: 86028121,
    seedP2: 32452843,
    dance: './assets/animations/macarena.json',
    danceBeats: 16
  }
};

export const DEFAULT_SONG = 'ragatanga';
