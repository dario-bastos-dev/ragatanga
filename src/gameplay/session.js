import {
  P1_KEYS,
  P2_KEYS
} from '../config/gameplay.js';

import {
  state,
  currentDifficulty
} from '../core/state.js';

import {
  wait
} from '../core/utils.js';

import {
  music,
  gameTime,
  currentPreviewTime
} from '../audio/music.js';

import {
  layoutRings
} from '../scene/stage.js';

import {
  spawnDancers,
  disableDancers,
  updateDancers
} from '../scene/dancers.js';

import {
  showMatchHud,
  showCountdown,
  hideCountdown,
  updateProgress
} from '../ui/hud.js';

import {
  showResults
} from '../ui/results.js';

import {
  buildDifficultyEvents
} from './chart.js';

import {
  makePlayer
} from './players.js';

import {
  updatePlayerNotes
} from './notes.js';

/*
  Ciclo da partida: preparação → contagem → jogo → resultado.
*/
export async function startMode(
  selectedMode
){

  state.mode = selectedMode;

  const mode =
    state.mode;

  showMatchHud();

  layoutRings(mode);

  const eventSet =
    buildDifficultyEvents();

  state.players.p1 =
    makePlayer(
      'p1',
      P1_KEYS,
      'notesP1',
      eventSet
    );

  state.players.p2 =
    mode === 2
      ? makePlayer(
          'p2',
          P2_KEYS,
          'notesP2',
          eventSet
        )
      : null;

  spawnDancers(mode);

  music.pause();

  music.currentTime =
    state.beatmap.audioStart;

  await startPreRoll();

  /*
    Audio é o relógio mestre.
  */
  await music.play();

  state.running = true;

}

async function startPreRoll(){

  const travelTime =
    currentDifficulty().travelTime;

  /*
    Mesmo no EXTREMO o jogador recebe
    alguns segundos para se preparar.
    A nota só aparece quando entra
    na janela de viagem correspondente.
  */
  state.preRollDuration =
    Math.max(
      3,
      travelTime
    );

  state.preRollStartedAt =
    performance.now();

  state.preRolling = true;

  while(true){

    const elapsed =
      (
        performance.now() -
        state.preRollStartedAt
      ) /
      1000;

    const remaining =
      Math.max(
        0,
        state.preRollDuration -
        elapsed
      );

    if(remaining <= 0){
      break;
    }

    const ratio =
      remaining /
      state.preRollDuration;

    showCountdown(
      ratio > .67
        ? '3'
        : ratio > .34
          ? '2'
          : '1'
    );

    await wait(35);

  }

  showCountdown('GO!');

  await wait(220);

  hideCountdown();

  state.preRolling = false;

}

/* Chamado a cada quadro pelo palco 3D. */
export function updateGame(){

  const players =
    state.players;

  if(state.preRolling){

    const preview =
      currentPreviewTime();

    updatePlayerNotes(
      players.p1,
      preview,
      false
    );

    if(state.mode === 2){

      updatePlayerNotes(
        players.p2,
        preview,
        false
      );

    }

    return;

  }

  if(!state.running){
    return;
  }

  const t =
    gameTime();

  updatePlayerNotes(
    players.p1,
    t,
    true
  );

  if(state.mode === 2){

    updatePlayerNotes(
      players.p2,
      t,
      true
    );

  }

  updateDancers(t);

  updateProgress(t);

  if(
    music.currentTime >=
      state.beatmap.audioEnd ||
    t >=
      state.beatmap.duration
  ){

    music.pause();
    music.currentTime = state.beatmap.audioEnd;

    finish();

  }

}

export function finish(){

  if(!state.running){
    return;
  }

  state.running = false;

  music.pause();

  disableDancers();

  showResults(
    state.players,
    state.mode
  );

}
