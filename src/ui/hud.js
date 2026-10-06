import {
  state,
  currentDifficulty
} from '../core/state.js';

/*
  HUD da partida: placar, combo, progresso, julgamentos,
  receptores, contagem regressiva e efeitos de tela.
*/
const menu =
  document.querySelector('#menuOverlay');

const hud =
  document.querySelector('#hud');

const countdown =
  document.querySelector('#countdown');

/* Esconde o menu e prepara o HUD para o modo/dificuldade escolhidos. */
export function showMatchHud(){

  const mode =
    state.mode;

  document.body
    .classList.toggle(
      'single',
      mode === 1
    );

  document.body
    .classList.toggle(
      'extreme',
      state.difficulty === 'extreme'
    );

  document
    .querySelector('#boardP2')
    .style.display =
      mode === 2
        ? 'block'
        : 'none';

  document
    .querySelector('#hudP2')
    .style.display =
      mode === 2
        ? 'block'
        : 'none';

  document
    .querySelector('#p2ProgressTag')
    .style.display =
      mode === 2
        ? 'inline-block'
        : 'none';

  document
    .querySelector('#difficultyHud')
    .textContent =
      currentDifficulty().label;

  menu.style.display =
    'none';

  hud.style.display =
    'block';

}

export function showCountdown(
  text
){

  countdown.style.display =
    'grid';

  countdown.textContent =
    text;

}

export function hideCountdown(){

  countdown.style.display =
    'none';

}

export function updatePlayerHud(
  player
){

  document
    .querySelector(
      '#score' +
      player.id.toUpperCase()
    )
    .textContent =
      String(
        player.score
      ).padStart(
        6,
        '0'
      );

  document
    .querySelector(
      '#combo' +
      player.id.toUpperCase()
    )
    .textContent =
      'COMBO x' +
      player.combo;

}

export function updateProgress(
  t
){

  const pct =
    Math.max(
      0,
      Math.min(
        100,
        (
          t /
          state.beatmap.duration
        ) *
        100
      )
    );

  document
    .querySelector('#progressFill')
    .style.width =
      pct + '%';

  document
    .querySelector('#progressPct')
    .textContent =
      Math.round(pct) + '%';

}

export function pulseReceptor(
  id,
  key,
  className
){

  const element =
    document.querySelector(
      `.receptor[data-player="${id}"][data-key="${key}"]`
    );

  if(!element){
    return;
  }

  element.classList.remove(
    'pressed',
    'hit'
  );

  void element.offsetWidth;

  element.classList.add(
    className
  );

  setTimeout(
    () => {

      element.classList.remove(
        className
      );

    },
    className === 'hit'
      ? 155
      : 90
  );

}

export function pulseSpecial(
  id,
  key,
  className
){

  const element =
    document.querySelector(
      `.specialReceptor[data-player="${id}"][data-key="${key}"]`
    );

  if(!element){
    return;
  }

  element.classList.remove(
    'pressed',
    'hit'
  );

  void element.offsetWidth;

  element.classList.add(
    className
  );

  setTimeout(
    () => {

      element.classList.remove(
        className
      );

    },
    className === 'hit'
      ? 175
      : 95
  );

}

export function animateNote(
  note,
  className
){

  note.element
    .classList.add(
      className
    );

  setTimeout(
    () => {

      note.element.style.display =
        'none';

    },
    155
  );

}

export function showJudgement(
  id,
  text,
  isMiss
){

  const element =
    document.querySelector(
      id === 'p1'
        ? '#judgeP1'
        : '#judgeP2'
    );

  element.textContent =
    text;

  element.style.opacity =
    '1';

  element.classList.toggle(
    'miss',
    isMiss
  );

  element.classList.remove(
    'pop'
  );

  void element.offsetWidth;

  element.classList.add(
    'pop'
  );

  clearTimeout(
    element._timer
  );

  element._timer =
    setTimeout(
      () => {

        element.style.opacity =
          '.12';

        element.classList.remove(
          'miss',
          'pop'
        );

      },
      420
    );

}

export function triggerShake(){

  document.body
    .classList.remove(
      'screen-shake'
    );

  void document.body.offsetWidth;

  document.body
    .classList.add(
      'screen-shake'
    );

  setTimeout(
    () => {

      document.body
        .classList.remove(
          'screen-shake'
        );

    },
    230
  );

}
