import * as THREE from 'three';

import {
  SONGS
} from '../config/songs.js';

import {
  DANCE_FADE
} from '../config/gameplay.js';

import {
  state,
  currentSong
} from '../core/state.js';

import {
  positiveModulo,
  beatPosition
} from '../core/utils.js';

import {
  loadPackedDance,
  retargetPackedClips
} from '../dances/packed-clips.js';

import {
  scene,
  stagePositions
} from './stage.js';

import {
  baseModel,
  createCharacter
} from './character.js';

/*
  Coreografias: danceFiles[id] é o arquivo carregado;
  danceClips[id] = { dance, idle } já aplicados ao personagem.
*/
const danceFiles = {};
const danceClips = {};
const danceLoading = new Set();
const danceErrors = new Set();

let lastAnimationAt = 0;

/*
  Carrega o arquivo de coreografia da música (se houver).
  onSettled é chamado quando termina, com sucesso ou erro.
*/
export function loadSongDance(
  id,
  onSettled
){

  const song =
    SONGS[id];

  if(
    !song.dance ||
    danceFiles[id] ||
    danceLoading.has(id)
  ){
    return;
  }

  danceLoading.add(id);

  loadPackedDance(song.dance)
    .then(
      file => {
        danceFiles[id] = file;
      }
    )
    .catch(
      error => {

        console.error(
          'Erro na coreografia:',
          error
        );

        danceErrors.add(id);

      }
    )
    .finally(
      () => {

        danceLoading.delete(id);
        onSettled();

      }
    );

}

export function isDanceReady(
  id
){

  return (
    !SONGS[id].dance ||
    Boolean(danceFiles[id])
  );

}

export function hasDanceError(
  id
){

  return danceErrors.has(id);

}

function getDanceClips(){

  const file =
    danceFiles[state.songId];

  if(!file){

    return {
      dance: baseModel.animations[0],
      idle: null
    };

  }

  danceClips[state.songId] ??=
    retargetPackedClips(
      file,
      baseModel
    );

  return danceClips[state.songId];

}

/*
  Cria o mixer do personagem com a coreografia da música.
  Com clip de idle, o personagem fica no idle enquanto o jogador erra
  e volta para a coreografia (com fade) quando acerta.
*/
function attachDance(
  object
){

  const {
    dance,
    idle
  } =
    getDanceClips();

  const mixer =
    new THREE.AnimationMixer(
      object
    );

  const action =
    mixer.clipAction(
      dance
    );

  action.play();

  let idleAction = null;

  if(idle){

    idleAction =
      mixer.clipAction(
        idle
      );

    idleAction.play();

    action.setEffectiveWeight(0);

  }

  mixer.setTime(0);

  return {
    object,
    mixer,
    clip: dance,
    action,
    idleAction,
    blend: 0,
    enabled: false
  };

}

function removeDancers(){

  for(
    const dancer
    of Object.values(state.dancers)
  ){

    if(dancer?.object){
      scene.remove(dancer.object);
    }

  }

  state.dancers = {
    p1: null,
    p2: null
  };

}

/* Coloca P1 (e P2, no modo 2 jogadores) no palco. */
export function spawnDancers(
  mode
){

  removeDancers();

  const positions =
    stagePositions(mode);

  state.dancers.p1 =
    attachDance(
      createCharacter(positions.p1)
    );

  if(mode === 2){

    state.dancers.p2 =
      attachDance(
        createCharacter(
          positions.p2,
          {
            tinted: true
          }
        )
      );

  }

}

export function setDancerEnabled(
  id,
  enabled
){

  const dancer =
    state.dancers[id];

  if(!dancer){
    return;
  }

  dancer.enabled =
    enabled;

}

export function disableDancers(){

  for(
    const dancer
    of Object.values(state.dancers)
  ){

    if(dancer){
      dancer.enabled = false;
    }

  }

}

/*
  Posição da animação no instante t da partida. Com danceBeats, o loop
  avança por batidas do beatmap em vez de segundos.
*/
function danceTime(
  t,
  duration
){

  const loopBeats =
    currentSong().danceBeats;

  if(!loopBeats){

    return positiveModulo(
      t,
      duration
    );

  }

  return positiveModulo(
    beatPosition(
      state.beatmap.beats,
      t
    ),
    loopBeats
  ) /
  loopBeats *
  duration;

}

function animateDancer(
  dancer,
  t,
  delta
){

  if(!dancer){
    return;
  }

  const animationTime =
    danceTime(
      t,
      dancer.clip.duration
    );

  /*
    Sem idle: o personagem congela enquanto o jogador erra.
  */
  if(!dancer.idleAction){

    if(dancer.enabled){
      dancer.mixer.setTime(animationTime);
    }

    return;

  }

  dancer.blend =
    THREE.MathUtils.clamp(
      dancer.blend +
        (dancer.enabled ? delta : -delta) /
        DANCE_FADE,
      0,
      1
    );

  dancer.action.setEffectiveWeight(
    dancer.blend
  );

  dancer.idleAction.setEffectiveWeight(
    1 - dancer.blend
  );

  dancer.mixer.setTime(animationTime);

}

export function updateDancers(
  t
){

  const now =
    performance.now();

  const delta =
    lastAnimationAt
      ? (now - lastAnimationAt) / 1000
      : 0;

  lastAnimationAt = now;

  animateDancer(
    state.dancers.p1,
    t,
    delta
  );

  if(state.mode === 2){

    animateDancer(
      state.dancers.p2,
      t,
      delta
    );

  }

}
