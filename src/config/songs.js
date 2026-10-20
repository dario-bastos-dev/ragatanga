import ragatangaBeatmap from '../beatmaps/ragatanga.js';
import thrillerBeatmap from '../beatmaps/thriller.js';
import ymcaBeatmap from '../beatmaps/ymca.js';
import macarenaBeatmap from '../beatmaps/macarena.js';

export const SONGS = {
  ragatanga: {
    title: 'RAGATANGA',
    audio: './assets/audio/ragatanga.mp3',
    background: './assets/backgrounds/ragatanga.png',
    backgroundVideo: './assets/backgrounds/videos/ragatanga-loop.mp4',
    beatmap: ragatangaBeatmap,
    seedP1: 104729,
    seedP2: 130363
  },

  thriller: {
    title: 'THRILLER',
    audio: './assets/audio/thriller.mp3',
    background: './assets/backgrounds/thriller.jpeg',
    backgroundVideo: './assets/backgrounds/videos/thriller-loop.mp4',
    beatmap: thrillerBeatmap,
    seedP1: 7919,
    seedP2: 15485863,
    dance: './assets/animations/thriller.json'
  },

  ymca: {
    title: 'YMCA',
    audio: './assets/audio/ymca.mp3',
    background: './assets/backgrounds/ymca.png',
    backgroundVideo: './assets/backgrounds/videos/ymca-loop.mp4',
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
    background: './assets/backgrounds/macarena.png',
    backgroundVideo: './assets/backgrounds/videos/macarena-loop.mp4',
    beatmap: macarenaBeatmap,
    seedP1: 86028121,
    seedP2: 32452843,
    dance: './assets/animations/macarena.json',
    danceBeats: 16
  }
};

export const DEFAULT_SONG = 'thriller';
