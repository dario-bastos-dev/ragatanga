import {
  HIT,
  NORMAL_TARGET_Y,
  SPAWN_Y
} from '../config/gameplay.js';

import {
  state,
  currentDifficulty
} from '../core/state.js';

import {
  resolvePassedNote,
  moveIndices
} from './judge.js';

/*
  Rolagem das notas: posiciona cada nota na pista conforme o tempo
  que falta para ela e marca como MISS as que passaram do alvo.
*/
function updateCollection(
  player,
  collection,
  t,
  travelTime,
  targetY,
  allowMisses
){

  for(
    const note
    of collection
  ){

    if(note.resolved){
      continue;
    }

    const secondsUntil =
      note.time -
      t;

    /*
      Ainda não entrou na pista.
    */
    if(
      secondsUntil >
      travelTime
    ){

      note.element.style.display =
        'none';

      continue;
    }

    /*
      Já passou bastante da zona.
    */
    if(
      secondsUntil <
      -.8
    ){

      note.element.style.display =
        'none';

      continue;
    }

    const progress =
      1 -
      (
        secondsUntil /
        travelTime
      );

    const y =
      SPAWN_Y +
      (
        targetY -
        SPAWN_Y
      ) *
      progress;

    note.element.style.display =
      'grid';

    note.element.style.top =
      y + '%';

    const near =
      Math.max(
        0,
        1 -
        Math.abs(
          secondsUntil
        ) /
        .44
      );

    note.element.style.transform =
      `translate(-50%,-50%) scale(${1 + near * .08})`;

    note.element.style.opacity =
      String(
        Math.max(
          .34,
          1 -
          Math.max(
            0,
            -secondsUntil
          ) *
          1.4
        )
      );

    if(
      allowMisses &&
      t >
        note.time +
        HIT.good &&
      !note.resolved
    ){

      resolvePassedNote(
        player,
        note
      );

    }

  }

}

export function updatePlayerNotes(
  player,
  t,
  allowMisses
){

  if(!player){
    return;
  }

  const travelTime =
    currentDifficulty().travelTime;

  updateCollection(
    player,
    player.notes,
    t,
    travelTime,
    NORMAL_TARGET_Y,
    allowMisses
  );

  if(
    state.difficulty ===
    'extreme'
  ){

    updateCollection(
      player,
      player.specials,
      t,
      travelTime,
      NORMAL_TARGET_Y,
      allowMisses
    );

  }

  moveIndices(player);

}
