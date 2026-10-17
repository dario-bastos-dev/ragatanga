import '../core/state.js';

function pauseGame(){

  if(
    gamePaused ||
    (!running && !preRolling)
  ){
    return;
  }

  gamePaused = true;

  if(preRolling){
    preRollElapsedAtPause =
      (
        performance.now() -
        preRollStartedAt
      ) /
      1000;
  }

  if(!music.paused){
    music.pause();
  }

  document.body
    .classList.add(
      'game-paused'
    );

  pauseOverlay
    .classList.remove(
      'hidden'
    );

  continueGameButton.focus();

}

async function resumeGame(){

  if(!gamePaused){
    return;
  }

  if(preRolling){

    preRollStartedAt =
      performance.now() -
      preRollElapsedAtPause * 1000;

    preMatchLastAt =
      performance.now();

  }

  gamePaused = false;

  document.body
    .classList.remove(
      'game-paused'
    );

  pauseOverlay
    .classList.add(
      'hidden'
    );

  if(
    running &&
    music.currentTime < AUDIO_END
  ){

    try{
      await music.play();
    }catch(error){
      console.warn(
        'Não foi possível retomar o áudio:',
        error
      );
    }

  }

}

function returnToMenu(){

  try{
    victorySound.pause();
    victorySound.currentTime = 0;
  }catch(error){}

  gamePaused = false;
  running = false;
  preRolling = false;

  music.pause();

  document.body
    .classList.remove(
      'game-paused'
    );

  /*
    O menu inicial já monta todos os estados da partida corretamente.
    Recarregar evita que notas/combos da partida interrompida vazem
    para a próxima tentativa.
  */
  location.reload();

}

async function startMode(
  selectedMode
){

  gamePaused = false;
  preRollElapsedAtPause = 0;
  defeatSequence = null;
  completionSequence = null;
  resultCelebrationSequence = null;
  pauseOverlay.classList.add('hidden');
  defeatOverlay.classList.add('hidden');
  completionOverlay.classList.add('hidden');
  resultOverlay.classList.add('hidden');
  document.body.classList.remove(
    'game-paused',
    'defeat-sequence',
    'completion-celebration'
  );

  mode = selectedMode;

  resetSceneDancers();

  document.body
    .classList.toggle(
      'single',
      mode === 1
    );

  document.body
    .classList.toggle(
      'extreme',
      DIFFICULTIES[selectedDifficulty].special
    );

  ringP1.position.x =
    mode === 2
      ? -72
      : 30;

  ringP2.visible =
    mode === 2;

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
      DIFFICULTIES[
        selectedDifficulty
      ].label;

  const eventSet =
    buildDifficultyEvents();

  players.p1 =
    makePlayer(
      'p1',
      P1_KEYS,
      'notesP1',
      eventSet
    );

  players.p2 =
    mode === 2
      ? makePlayer(
          'p2',
          P2_KEYS,
          'notesP2',
          eventSet
        )
      : null;

  updatePlayerHud(players.p1);

  if(players.p2){
    updatePlayerHud(players.p2);
  }

  createP1(
    mode === 2
      ? -72
      : 30
  );

  if(mode === 2){
    createP2(72);
  }

  menu.style.display =
    'none';

  hud.style.display =
    'block';

  stopMenuPreview();
  music.pause();
  music.volume = 1;

  await seekMusicTo(AUDIO_START);

  await startPreRoll();

  /*
    O pré-roll usa um relógio visual separado. Antes de iniciar o áudio,
    reposicionamos novamente no início exato para impedir que a primeira
    nota recue quando o relógio mestre muda para music.currentTime.
  */
  await seekMusicTo(AUDIO_START);

  running = true;
  lastAnimationAt = performance.now();

  try{
    await music.play();
  }catch(error){
    running = false;
    console.error('Não foi possível iniciar a música:', error);
    throw error;
  }

}

async function startPreRoll(){

  preRollDuration =
    PRE_ROLL_SECONDS;

  preRollStartedAt =
    performance.now();

  preRolling = true;

  clearTimeout(
    countdown._hideTimer
  );

  countdown.classList.remove(
    'dance',
    'pulse'
  );

  countdown.style.display =
    'grid';

  countdown.textContent =
    '';

  startPreMatchAnimations();

  while(true){

    if(gamePaused){
      await wait(35);
      continue;
    }

    const elapsed =
      (
        performance.now() -
        preRollStartedAt
      ) /
      1000;

    const remaining =
      Math.max(
        0,
        preRollDuration -
        elapsed
      );

    if(remaining <= 0){
      break;
    }

    const nextLabel =
      String(
        Math.max(
          1,
          Math.ceil(remaining)
        )
      );

    if(
      countdown.textContent !==
      nextLabel
    ){

      countdown.textContent =
        nextLabel;

      countdown.classList.remove(
        'pulse'
      );

      void countdown.offsetWidth;

      countdown.classList.add(
        'pulse'
      );

    }

    await wait(35);

  }

  while(gamePaused){
    await wait(35);
  }

  countdown.textContent =
    'DANCE!';

  countdown.classList.remove(
    'pulse'
  );

  countdown.classList.add(
    'dance'
  );

  preRolling = false;

  /*
    A coreografia é armada no mesmo instante em que DANCE! aparece.
    O áudio será iniciado imediatamente após o retorno desta função.
  */
  beginDanceAnimations();

  countdown._hideTimer =
    setTimeout(
      () => {

        countdown.style.display =
          'none';

        countdown.classList.remove(
          'dance',
          'pulse'
        );

      },
      DANCE_BANNER_MS
    );

}

function endByMistakeLimit(
  triggeringPlayer
){

  if(!running){
    return;
  }

  running = false;
  preRolling = false;
  gamePaused = false;
  completionSequence = null;
  completionOverlay.classList.add('hidden');

  music.pause();

  pauseOverlay.classList.add('hidden');
  document.body.classList.remove('game-paused', 'completion-celebration');
  document.body.classList.add('defeat-sequence');

  const outcome =
    mode === 2
      ? chooseMultiplayerOutcome(triggeringPlayer)
      : {
          winner: null,
          loser: triggeringPlayer
        };

  const loser = outcome.loser;
  const winner = outcome.winner;

  const defeatDuration =
    startDefeatAnimation(loser);

  /*
    A animação de vitória só acontece quando a partida de 2 jogadores
    termina pelo sistema de limite de erros. O encerramento normal da
    música continua usando somente a tela de resultado tradicional.
  */
  const victoryDuration =
    mode === 2 && winner
      ? startVictoryAnimation(winner)
      : 0;

  const duration =
    Math.max(
      defeatDuration,
      victoryDuration
    );

  defeatSequence = {
    loser,
    winner,
    startedAt: performance.now(),
    lastAt: performance.now(),
    duration,
    overlayShown: false
  };

}

function startDefeatAnimation(
  loser
){

  const dancer =
    dancers[loser?.id];

  const clip =
    dancer?.defeatClip ||
    defeatClip;

  if(
    !dancer ||
    !clip
  ){
    return 1.2;
  }

  try{

    dancer.mixer.stopAllAction();
    dancer.mixer.setTime(0);

    const action =
      dancer.mixer.clipAction(
        clip
      );

    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setLoop(
      THREE.LoopOnce,
      1
    );
    action.clampWhenFinished = true;
    action.play();

    dancer.defeatAction = action;

    return THREE.MathUtils.clamp(
      clip.duration || 2,
      1.2,
      4.5
    );

  }catch(error){

    console.error(
      'Não foi possível executar a animação de derrota:',
      error
    );

    return 1.2;

  }

}

function startVictoryAnimation(
  winner
){

  const dancer =
    dancers[winner?.id];

  const clip =
    dancer?.victoryClip ||
    victoryClip;

  if(
    !dancer ||
    !clip
  ){
    return 0;
  }

  try{

    dancer.mixer.stopAllAction();
    dancer.mixer.setTime(0);

    const action =
      dancer.mixer.clipAction(
        clip
      );

    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setLoop(
      THREE.LoopOnce,
      1
    );
    action.clampWhenFinished = true;
    action.play();

    dancer.victoryAction = action;

    return THREE.MathUtils.clamp(
      clip.duration || 2,
      1.2,
      4.5
    );

  }catch(error){

    console.error(
      'Não foi possível executar a animação de vitória:',
      error
    );

    return 0;

  }

}

function updateDefeatSequence(){

  if(
    !defeatSequence ||
    defeatSequence.overlayShown
  ){
    return;
  }

  const now =
    performance.now();

  const delta =
    Math.max(
      0,
      (now - defeatSequence.lastAt) / 1000
    );

  defeatSequence.lastAt = now;

  const loserDancer =
    dancers[defeatSequence.loser?.id];

  if(
    loserDancer?.defeatAction &&
    (loserDancer.defeatClip || defeatClip)
  ){
    loserDancer.mixer.update(delta);
  }

  const winnerDancer =
    dancers[defeatSequence.winner?.id];

  if(
    winnerDancer?.victoryAction &&
    (winnerDancer.victoryClip || victoryClip)
  ){
    winnerDancer.mixer.update(delta);
  }

  const elapsed =
    (now - defeatSequence.startedAt) / 1000;

  if(
    elapsed >= defeatSequence.duration + .12
  ){

    defeatSequence.overlayShown = true;
    showDefeatOverlay(
      defeatSequence.loser,
      defeatSequence.winner
    );

  }

}

function showDefeatOverlay(
  loser,
  winner
){

  const limit =
    DIFFICULTIES[selectedDifficulty].missLimit;

  const loserLabel =
    loser.id.toUpperCase();

  if(mode === 1){

    defeatTitle.textContent =
      'PERDEU!';

    defeatMessage.textContent =
      'Você errou demais!';

    defeatDetails.textContent =
      `Limite do ${DIFFICULTIES[selectedDifficulty].label}: ${limit} erros seguidos.`;

  }else{

    const winnerLabel =
      winner.id.toUpperCase();

    defeatTitle.textContent =
      `${winnerLabel} VENCEU!`;

    defeatMessage.textContent =
      `${loserLabel} perdeu! Você errou demais!`;

    defeatDetails.textContent =
      `Erros na partida — P1: ${players.p1.results.miss} · P2: ${players.p2.results.miss}. Limite: ${limit} erros seguidos.`;

  }

  defeatOverlay.classList.remove('hidden');
  defeatRetryButton.focus();

}

function retryCurrentMode(){

  const retryMode = mode;

  defeatSequence = null;
  defeatOverlay.classList.add('hidden');
  document.body.classList.remove('defeat-sequence');

  startMode(retryMode);

}

function gameTime(){

  return (
    music.currentTime -
    AUDIO_START
  );

}

function currentPreviewState(){

  if(!preRolling){
    return {
      time: gameTime(),
      progress: 1
    };
  }

  const elapsed =
    (
      performance.now() -
      preRollStartedAt
    ) /
    1000;

  const progress =
    THREE.MathUtils.clamp(
      elapsed /
      Math.max(preRollDuration, .001),
      0,
      1
    );

  const travelTime =
    DIFFICULTIES[
      selectedDifficulty
    ].travelTime;

  /*
    Durante 3 → 2 → 1, o relógio visual parte antes do zero e chega
    exatamente em 0. A velocidade das notas começa reduzida e converge
    para a velocidade real, evitando qualquer salto ao iniciar a música.
  */
  const previewStart =
    -Math.max(
      2.4,
      travelTime * 1.15
    );

  return {
    time:
      previewStart *
      (1 - progress),
    progress
  };

}

function updateCollection(
  player,
  collection,
  t,
  travelTime,
  targetY,
  allowMisses,
  maxY = Infinity
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

    let y =
      SPAWN_Y +
      (
        targetY -
        SPAWN_Y
      ) *
      progress;

    /*
      No pré-jogo as notas podem se aproximar, mas nunca encostam
      no receptor antes do DANCE!.
    */
    y = Math.min(
      y,
      maxY
    );

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

      if(!running){
        return;
      }

    }

  }

}

function updatePlayerNotes(
  player,
  t,
  allowMisses,
  options = {}
){

  if(!player){
    return;
  }

  const travelTime =
    DIFFICULTIES[
      selectedDifficulty
    ].travelTime *
    (options.travelTimeMultiplier ?? 1);

  const maxY =
    options.maxY ?? Infinity;

  updateCollection(
    player,
    player.notes,
    t,
    travelTime,
    NORMAL_TARGET_Y,
    allowMisses,
    maxY
  );

  if(
    allowMisses &&
    !running
  ){
    return;
  }

  if(
    selectedDifficulty ===
    'extreme'
  ){

    updateCollection(
      player,
      player.specials,
      t,
      travelTime,
      NORMAL_TARGET_Y,
      allowMisses,
      maxY
    );

  }

  moveIndices(player);

}

function updateProgress(
  t
){

  const pct =
    Math.max(
      0,
      Math.min(
        100,
        (
          t /
          GAME_DURATION
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

function updateGame(){

  if(gamePaused){
    return;
  }

  if(preRolling){

    const preview =
      currentPreviewState();

    const travelTimeMultiplier =
      1 +
      (
        1 -
        preview.progress
      ) *
      (
        PRE_ROLL_VISUAL_SPEED_MULTIPLIER -
        1
      );

    const previewOptions = {
      travelTimeMultiplier,
      maxY: PRE_ROLL_MAX_Y
    };

    updatePlayerNotes(
      players.p1,
      preview.time,
      false,
      previewOptions
    );

    if(mode === 2){

      updatePlayerNotes(
        players.p2,
        preview.time,
        false,
        previewOptions
      );

    }

    updatePreMatchAnimations();

    return;

  }

  if(!running){
    return;
  }

  const t =
    gameTime();

  updatePlayerNotes(
    players.p1,
    t,
    true
  );

  if(!running){
    return;
  }

  if(mode === 2){

    updatePlayerNotes(
      players.p2,
      t,
      true
    );

  }

  updateAnimation();

  updateProgress(t);

  if(
    music.currentTime >=
      AUDIO_END ||
    t >=
      GAME_DURATION
  ){

    music.pause();
    music.currentTime = AUDIO_END;

    finish();

  }

}

function finish(){

  if(!running){
    return;
  }

  running = false;
  preRolling = false;
  gamePaused = false;

  music.pause();

  /*
    Encerramento normal = celebração.
    Derrota por limite de erros não passa por finish(), portanto nunca
    dispara YOU DANCE! nem estas coreografias.
  */
  startCompletionCelebration();

}


Object.assign(globalThis, {
  pauseGame,
  resumeGame,
  returnToMenu,
  startMode,
  startPreRoll,
  endByMistakeLimit,
  startDefeatAnimation,
  startVictoryAnimation,
  updateDefeatSequence,
  showDefeatOverlay,
  retryCurrentMode,
  gameTime,
  currentPreviewState,
  updateCollection,
  updatePlayerNotes,
  updateProgress,
  updateGame,
  finish
});
