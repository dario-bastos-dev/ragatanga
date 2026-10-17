import '../core/state.js';

function handleInput(
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
      'ERROU'
    );

    return;

  }

  judgeCandidate(
    player,
    candidate,
    false
  );

}

function handleSpecialInput(
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
      key === 'Enter'
        ? 'ERROU ENTER'
        : 'ERROU X'
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
        'PERFEITO',
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
        'ÓTIMO',
        75,
        'great'
      );

    }else{

      resolveHit(
        player,
        note,
        'BOM',
        50,
        'good'
      );

    }

    return;

  }

  registerInputMiss(
    player,
    special
      ? (
          note.key === 'Enter'
            ? 'ERROU ENTER'
            : 'ERROU X'
        )
      : (
          signed < 0
            ? 'ERROU • CEDO'
            : 'ERROU • TARDE'
        )
  );

}

function setDancerEnabled(
  id,
  enabled
){

  const dancer =
    dancers[id];

  if(!dancer){
    return;
  }

  dancer.enabled =
    enabled;

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
  player.consecutiveMisses = 0;

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
  player.consecutiveMisses = 0;

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
    (
      note.key === 'Enter'
        ? 'ENTER ESPECIAL +'
        : 'X ESPECIAL +'
    ) +
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
  player.consecutiveMisses++;

  setDancerEnabled(
    player.id,
    false
  );

  playMissSound();

  showJudgement(
    player.id,
    label + ' -' +
      MISS_PENALTY,
    true
  );

  triggerShake();
  updatePlayerHud(player);
  checkMistakeLimit(player);

}

function resolvePassedNote(
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
  player.consecutiveMisses++;

  setDancerEnabled(
    player.id,
    false
  );

  playMissSound();

  animateNote(
    note,
    'missed'
  );

  showJudgement(
    player.id,
    note.type === 'special'
      ? (
          note.key === 'Enter'
            ? 'ERROU ENTER -' + MISS_PENALTY
            : 'ERROU X -' + MISS_PENALTY
        )
      : 'ERROU -' + MISS_PENALTY,
    true
  );

  triggerShake();

  moveIndices(player);
  updatePlayerHud(player);
  checkMistakeLimit(player);

}

function checkMistakeLimit(
  player
){

  if(
    !running ||
    !player
  ){
    return;
  }

  const limit =
    DIFFICULTIES[selectedDifficulty].missLimit;

  if(
    player.consecutiveMisses < limit
  ){
    return;
  }

  endByMistakeLimit(player);

}

function chooseMultiplayerOutcome(
  triggeringPlayer
){

  const p1 = players.p1;
  const p2 = players.p2;

  /*
    Regra pedida para 2 jogadores: vence quem errou menos durante
    a partida. Em empate de erros, a pontuação desempata. Persistindo
    empate, quem atingiu o limite de erros é considerado derrotado.
  */
  if(p1.results.miss !== p2.results.miss){

    const winner =
      p1.results.miss < p2.results.miss
        ? p1
        : p2;

    return {
      winner,
      loser: winner === p1 ? p2 : p1
    };

  }

  if(p1.score !== p2.score){

    const winner =
      p1.score > p2.score
        ? p1
        : p2;

    return {
      winner,
      loser: winner === p1 ? p2 : p1
    };

  }

  return {
    winner:
      triggeringPlayer === p1
        ? p2
        : p1,
    loser: triggeringPlayer
  };

}

function moveIndices(
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


Object.assign(globalThis, {
  handleInput,
  handleSpecialInput,
  findCandidate,
  judgeCandidate,
  setDancerEnabled,
  resolveHit,
  resolveSpecialHit,
  registerInputMiss,
  resolvePassedNote,
  checkMistakeLimit,
  chooseMultiplayerOutcome,
  moveIndices
});
