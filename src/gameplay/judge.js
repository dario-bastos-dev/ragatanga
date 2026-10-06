import {
  HIT,
  MISS_PENALTY,
  SPECIAL_SCORE
} from '../config/gameplay.js';

import {
  gameTime
} from '../audio/music.js';

import {
  setDancerEnabled
} from '../scene/dancers.js';

import {
  updatePlayerHud,
  pulseReceptor,
  pulseSpecial,
  animateNote,
  showJudgement,
  triggerShake
} from '../ui/hud.js';

/*
  Julgamento: transforma teclas em PERFECT/GREAT/GOOD/MISS,
  atualiza placar e combo e liga/desliga a dança do personagem.
*/

/* Nome da tecla do especial na tela: X (P1) ou ENTER (P2). */
function specialLabel(
  key
){

  return key === 'Enter'
    ? 'ENTER'
    : 'X';

}

export function handleInput(
  player,
  key
){

  if(!player){
    return;
  }

  pulseReceptor(
    player.id,
    key,
    'pressed'
  );

  const t =
    gameTime();

  const candidate =
    findCandidate(
      player.notes,
      key,
      t
    );

  if(!candidate){

    registerInputMiss(
      player,
      'MISS'
    );

    return;

  }

  judgeCandidate(
    player,
    candidate,
    false
  );

}

export function handleSpecialInput(
  player,
  key
){

  if(!player){
    return;
  }

  const t =
    gameTime();

  pulseSpecial(
    player.id,
    key,
    'pressed'
  );

  const candidate =
    findCandidate(
      player.specials,
      key,
      t
    );

  if(!candidate){

    registerInputMiss(
      player,
      'MISS ' + specialLabel(key)
    );

    return;

  }

  judgeCandidate(
    player,
    candidate,
    true
  );

}

function findCandidate(
  collection,
  key,
  t
){

  let best = null;
  let bestDistance = Infinity;

  for(
    const note
    of collection
  ){

    if(
      note.resolved ||
      note.key !== key
    ){
      continue;
    }

    const distance =
      Math.abs(
        t -
        note.time
      );

    if(
      distance <
      bestDistance &&
      distance <= .72
    ){

      best =
        note;

      bestDistance =
        distance;

    }

  }

  return best;

}

function judgeCandidate(
  player,
  note,
  special
){

  const t =
    gameTime();

  const signed =
    t -
    note.time;

  const difference =
    Math.abs(signed);

  if(
    difference <=
    HIT.good
  ){

    if(special){

      resolveSpecialHit(
        player,
        note
      );

    }else if(
      difference <=
      HIT.perfect
    ){

      resolveHit(
        player,
        note,
        'PERFECT',
        100,
        'perfect'
      );

    }else if(
      difference <=
      HIT.great
    ){

      resolveHit(
        player,
        note,
        'GREAT',
        75,
        'great'
      );

    }else{

      resolveHit(
        player,
        note,
        'GOOD',
        50,
        'good'
      );

    }

    return;

  }

  registerInputMiss(
    player,
    special
      ? 'MISS ' + specialLabel(note.key)
      : (
          signed < 0
            ? 'MISS • CEDO'
            : 'MISS • TARDE'
        )
  );

}

function resolveHit(
  player,
  note,
  label,
  points,
  type
){

  note.resolved = true;

  player.score +=
    points;

  player.combo++;

  player.maxCombo =
    Math.max(
      player.maxCombo,
      player.combo
    );

  player.results[type]++;

  setDancerEnabled(
    player.id,
    true
  );

  pulseReceptor(
    player.id,
    note.key,
    'hit'
  );

  animateNote(
    note,
    'hit'
  );

  showJudgement(
    player.id,
    label + ' +' + points,
    false
  );

  moveIndices(player);
  updatePlayerHud(player);

}

function resolveSpecialHit(
  player,
  note
){

  note.resolved = true;

  player.score +=
    SPECIAL_SCORE;

  player.combo++;

  player.maxCombo =
    Math.max(
      player.maxCombo,
      player.combo
    );

  player.results.special++;

  setDancerEnabled(
    player.id,
    true
  );

  pulseSpecial(
    player.id,
    note.key,
    'hit'
  );

  animateNote(
    note,
    'hit'
  );

  showJudgement(
    player.id,
    specialLabel(note.key) +
      ' SPECIAL +' +
      SPECIAL_SCORE,
    false
  );

  moveIndices(player);
  updatePlayerHud(player);

}

function registerInputMiss(
  player,
  label
){

  player.score =
    Math.max(
      0,
      player.score -
      MISS_PENALTY
    );

  player.combo = 0;
  player.results.miss++;

  setDancerEnabled(
    player.id,
    false
  );

  showJudgement(
    player.id,
    label + ' -' +
      MISS_PENALTY,
    true
  );

  triggerShake();
  updatePlayerHud(player);

}

/* Nota que passou da janela de acerto sem ser tocada. */
export function resolvePassedNote(
  player,
  note
){

  if(note.resolved){
    return;
  }

  note.resolved = true;

  player.score =
    Math.max(
      0,
      player.score -
      MISS_PENALTY
    );

  player.combo = 0;
  player.results.miss++;

  setDancerEnabled(
    player.id,
    false
  );

  animateNote(
    note,
    'missed'
  );

  showJudgement(
    player.id,
    (
      note.type === 'special'
        ? 'MISS ' + specialLabel(note.key)
        : 'MISS'
    ) +
      ' -' +
      MISS_PENALTY,
    true
  );

  triggerShake();

  moveIndices(player);
  updatePlayerHud(player);

}

export function moveIndices(
  player
){

  while(
    player.noteIndex <
      player.notes.length &&
    player.notes[
      player.noteIndex
    ].resolved
  ){
    player.noteIndex++;
  }

  while(
    player.specialIndex <
      player.specials.length &&
    player.specials[
      player.specialIndex
    ].resolved
  ){
    player.specialIndex++;
  }

}
