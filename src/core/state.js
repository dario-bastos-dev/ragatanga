import {
  SONGS,
  DEFAULT_SONG
} from '../config/songs.js';

import {
  DIFFICULTIES,
  DEFAULT_DIFFICULTY
} from '../config/difficulties.js';

/*
  Estado compartilhado da partida.
  Os módulos leem e escrevem aqui em vez de usar variáveis globais.
*/
export const state = {
  songId: DEFAULT_SONG,
  beatmap: SONGS[DEFAULT_SONG].beatmap,
  difficulty: DEFAULT_DIFFICULTY,

  /* 1 ou 2 jogadores. */
  mode: 1,

  running: false,
  preRolling: false,
  preRollStartedAt: 0,
  preRollDuration: 3,

  players: {},

  dancers: {
    p1: null,
    p2: null
  }
};

export function currentSong(){

  return SONGS[state.songId];

}

export function currentDifficulty(){

  return DIFFICULTIES[state.difficulty];

}

/*
  Dificuldade com a 5ª pista (especiais X / Enter).
  É a flag `special` da dificuldade que decide, não o nome.
*/
export function hasSpecialLane(){

  return currentDifficulty().special;

}
