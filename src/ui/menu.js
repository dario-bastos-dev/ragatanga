import {
  SONGS
} from '../config/songs.js';

import {
  state,
  currentSong,
  currentDifficulty
} from '../core/state.js';

import {
  formatTime
} from '../core/utils.js';

import {
  music,
  loadMusic,
  hasMusicError,
  isMusicReady
} from '../audio/music.js';

import {
  isCharacterLoaded,
  hasCharacterError
} from '../scene/character.js';

import {
  loadSongDance,
  isDanceReady,
  hasDanceError
} from '../scene/dancers.js';

const onePlayerButton =
  document.querySelector('#onePlayer');

const twoPlayersButton =
  document.querySelector('#twoPlayers');

const menuStatus =
  document.querySelector('#menuStatus');

/*
  Menu inicial: escolha de música, dificuldade e modo.
  onStart(mode) é chamado ao clicar em 1 ou 2 jogadores.
*/
export function initMenu(
  {
    onStart
  }
){

  initSongMenu();
  initDifficultyMenu();

  onePlayerButton.onclick =
    () => onStart(1);

  twoPlayersButton.onclick =
    () => onStart(2);

  document
    .querySelector('#backMenu')
    .onclick =
      () => location.reload();

}

function setMenuStatus(
  text
){

  menuStatus.textContent =
    text;

}

function initSongMenu(){

  document
    .querySelectorAll('.songCard')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => selectSong(
            button.dataset.song
          )
        );

      }
    );

  music.addEventListener(
    'error',
    () => {

      onePlayerButton.disabled = true;
      twoPlayersButton.disabled = true;

      setMenuStatus(
        'Áudio não encontrado: ' +
        currentSong().audio
      );

    }
  );

  music.addEventListener(
    'loadeddata',
    updateMenuAvailability
  );

  selectSong(state.songId);

}

function selectSong(id){

  const song =
    SONGS[id];

  if(!song){
    return;
  }

  state.songId = id;
  state.beatmap = song.beatmap;

  document
    .querySelectorAll('.songCard')
    .forEach(
      item =>
        item.classList.toggle(
          'active',
          item.dataset.song === id
        )
    );

  document
    .querySelector('#progressStart')
    .textContent =
      formatTime(state.beatmap.audioStart);

  document
    .querySelector('#progressEnd')
    .textContent =
      formatTime(state.beatmap.audioEnd);

  loadMusic(song.audio);

  loadSongDance(
    id,
    updateMenuAvailability
  );

  updateDifficultyInfo();
  updateMenuAvailability();

}

function initDifficultyMenu(){

  document
    .querySelectorAll('.difficultyCard')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            state.difficulty =
              button.dataset.difficulty;

            document
              .querySelectorAll('.difficultyCard')
              .forEach(
                item =>
                  item.classList.toggle(
                    'selected',
                    item === button
                  )
              );

            updateDifficultyInfo();

          }
        );

      }
    );

  updateDifficultyInfo();

}

function updateDifficultyInfo(){

  const config =
    currentDifficulty();

  const beatCount =
    state.beatmap.beats.length;

  const noteCount =
    Math.ceil(
      beatCount /
      config.beatStep
    );

  let extra = '';

  if(config.special){
    extra =
      ` + ~${Math.floor(beatCount / 8)} hits X`;
  }

  document
    .querySelector('#difficultyInfo')
    .textContent =
      `${config.label} · ${noteCount} hits musicais${extra} · ${config.description}`;

}

/*
  Libera os botões de jogar quando personagem, música e coreografia
  estão carregados; senão mostra o que falta.
*/
export function updateMenuAvailability(){

  const characterReady =
    isCharacterLoaded();

  const danceReady =
    isDanceReady(state.songId);

  const ready =
    characterReady &&
    isMusicReady() &&
    danceReady;

  onePlayerButton.disabled = !ready;
  twoPlayersButton.disabled = !ready;

  if(ready){

    setMenuStatus(
      `Pronto · ${state.beatmap.beatCount} batidas mapeadas · ${state.beatmap.detectedBpm.toFixed(1)} BPM`
    );

    return;

  }

  let status =
    'Carregando música…';

  if(hasCharacterError()){
    status = 'Não foi possível carregar o P1.';
  }else if(hasDanceError(state.songId)){
    status = 'Não foi possível carregar a coreografia.';
  }else if(hasMusicError()){
    status = 'Áudio não encontrado: ' + currentSong().audio;
  }else if(!characterReady){
    status = 'Carregando personagem 3D…';
  }else if(!danceReady){
    status = 'Carregando coreografia…';
  }

  setMenuStatus(status);

}
