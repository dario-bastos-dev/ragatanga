/*
  Rhythm Battle — ponto de entrada.
  Só inicializa os módulos e conecta os eventos entre eles.

  config/    dados estáticos (músicas, dificuldades, teclas, regras)
  core/      estado compartilhado da partida e utilitários
  audio/     música e relógio da partida
  scene/     palco 3D, personagem e coreografias
  gameplay/  notas, julgamento, teclado e ciclo da partida
  ui/        menu, HUD e resultado
*/
import {
  music
} from './audio/music.js';

import {
  initStage
} from './scene/stage.js';

import {
  loadCharacter
} from './scene/character.js';

import {
  initMenu,
  setMenuStatus,
  updateMenuAvailability
} from './ui/menu.js';

import {
  initInput
} from './gameplay/input.js';

import {
  startMode,
  updateGame,
  finish
} from './gameplay/session.js';

initMenu({
  onStart: startMode
});

initStage(updateGame);

loadCharacter(
  updateMenuAvailability,
  () => setMenuStatus('Não foi possível carregar o P1.')
);

initInput();

/* Garante o fim da partida se o áudio acabar antes da janela. */
music.addEventListener(
  'ended',
  finish
);
