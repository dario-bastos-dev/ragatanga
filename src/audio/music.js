import {
  state
} from '../core/state.js';

/*
  O áudio é o relógio mestre da partida:
  o tempo de jogo é a posição da música dentro da janela do beatmap.
*/
export const music =
  document.querySelector('#music');

let musicError = false;

music.addEventListener(
  'error',
  () => {
    musicError = true;
  }
);

export function loadMusic(
  url
){

  musicError = false;

  music.src =
    url;

  music.load();

}

export function hasMusicError(){

  return musicError;

}

export function isMusicReady(){

  return music.readyState >= 2;

}

export function gameTime(){

  return (
    music.currentTime -
    state.beatmap.audioStart
  );

}

/*
  Durante a contagem regressiva a música ainda não tocou:
  as notas já descem usando um relógio negativo até 0.
*/
export function currentPreviewTime(){

  if(!state.preRolling){
    return gameTime();
  }

  const elapsed =
    (
      performance.now() -
      state.preRollStartedAt
    ) /
    1000;

  return (
    -state.preRollDuration +
    elapsed
  );

}
