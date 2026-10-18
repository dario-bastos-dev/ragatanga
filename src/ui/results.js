import '../core/state.js';

function startCompletionCelebration(){

  completionOverlay.classList.remove('hidden');
  document.body.classList.add('completion-celebration');

  try{
    victorySound.pause();
    victorySound.currentTime = 0;
    victorySound.volume = .92;
    victorySound.play().catch(() => {});
  }catch(error){}

  playCrowdCelebrationSound();

  const activeIds =
    mode === 2
      ? ['p1', 'p2']
      : ['p1'];

  for(const id of activeIds){

    const dancer = dancers[id];
    const clip =
      dancer?.completionClip ||
      completionClips[id];

    if(!dancer || !clip){
      continue;
    }

    try{

      dancer.enabled = false;
      dancer.mixer.stopAllAction();
      dancer.mixer.setTime(0);

      const action =
        dancer.mixer.clipAction(clip);

      action.reset();
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.setDuration(
        COMPLETION_CELEBRATION_SECONDS
      );
      action.play();

      dancer.completionAction = action;

    }catch(error){

      console.error(
        `Não foi possível executar a comemoração do ${id.toUpperCase()}:`,
        error
      );

    }

  }

  completionSequence = {
    startedAt: performance.now(),
    lastAt: performance.now(),
    duration: COMPLETION_CELEBRATION_SECONDS,
    finished: false
  };

}

function updateCompletionSequence(){

  if(
    !completionSequence ||
    completionSequence.finished
  ){
    return;
  }

  const now = performance.now();
  const delta = Math.min(
    .06,
    Math.max(
      0,
      (now - completionSequence.lastAt) / 1000
    )
  );

  completionSequence.lastAt = now;

  const activeIds =
    mode === 2
      ? ['p1', 'p2']
      : ['p1'];

  for(const id of activeIds){
    const dancer = dancers[id];
    if(
      dancer?.completionAction &&
      (dancer.completionClip || completionClips[id])
    ){
      dancer.mixer.update(delta);
    }
  }

  const elapsed =
    (now - completionSequence.startedAt) / 1000;

  if(elapsed >= completionSequence.duration){
    completionSequence.finished = true;
    finishCompletionCelebration();
  }

}

function finishCompletionCelebration(){

  completionOverlay.classList.add('hidden');
  document.body.classList.remove('completion-celebration');

  try{
    victorySound.pause();
    victorySound.currentTime = 0;
  }catch(error){}

  stopCrowdCelebrationSound();

  for(
    const dancer
    of Object.values(dancers)
  ){

    if(!dancer){
      continue;
    }

    if(dancer.completionAction){
      dancer.completionAction.stop();
      dancer.completionAction = null;
    }

    dancer.enabled = false;

  }

  completionSequence = null;
  showNormalResults();

}

function centerModelAtX(object, targetX){

  if(!object){
    return;
  }

  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  box.getCenter(center);

  object.position.x += targetX - center.x;
  object.updateMatrixWorld(true);

}

function startResultCelebration(winnerId){

  resultCelebrationSequence = {
    lastAt: performance.now(),
    active: []
  };

  const visibleIds =
    mode === 2 && winnerId === 'EMPATE'
      ? ['p1', 'p2']
      : [winnerId === 'P2' ? 'p2' : 'p1'];

  for(const id of ['p1','p2']){

    const dancer = dancers[id];

    if(!dancer?.object){
      continue;
    }

    const visible = visibleIds.includes(id);
    dancer.object.visible = visible;

    if(!visible){
      continue;
    }

    const targetX =
      visibleIds.length === 2
        ? (id === 'p1' ? -162 : -100)
        : -150;

    centerModelAtX(dancer.object, targetX);

    dancer.mixer.stopAllAction();

    const clip =
      dancer.completionClip ||
      completionClips[id] ||
      dancer.clip;

    if(!clip){
      continue;
    }

    const action = dancer.mixer.clipAction(clip);
    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();

    resultCelebrationSequence.active.push({ dancer, action });

  }

  if(contactShadowP1){
    contactShadowP1.visible = visibleIds.includes('p1');
    if(contactShadowP1.visible){
      contactShadowP1.position.x = visibleIds.length === 2 ? -162 : -150;
    }
  }

  if(contactShadowP2){
    contactShadowP2.visible = visibleIds.includes('p2');
    if(contactShadowP2.visible){
      contactShadowP2.position.x = visibleIds.length === 2 ? -100 : -150;
    }
  }

  ringP1.visible = visibleIds.includes('p1');
  ringP2.visible = visibleIds.includes('p2');

  if(ringP1.visible){
    ringP1.position.x = visibleIds.length === 2 ? -162 : -150;
  }

  if(ringP2.visible){
    ringP2.position.x = visibleIds.length === 2 ? -100 : -150;
  }

}

function updateResultCelebration(){

  if(!resultCelebrationSequence || resultOverlay.classList.contains('hidden')){
    return;
  }

  const now = performance.now();
  const delta = Math.min(.06, Math.max(0, (now - resultCelebrationSequence.lastAt) / 1000));
  resultCelebrationSequence.lastAt = now;

  for(const item of resultCelebrationSequence.active){
    item.dancer.mixer.update(delta);
  }

}

function showNormalResults(){

  let saveError = null;

  try{

    recordMatch({
      songId: selectedSong,
      difficulty: selectedDifficulty,
      mode,
      players: [
        { id: 'P1', score: players.p1.score },
        ...(mode === 2 ? [{ id: 'P2', score: players.p2.score }] : [])
      ]
    });

  }catch(error){

    console.error('Não foi possível salvar a partida no ranking.', error);
    saveError = 'Não foi possível salvar esta partida no ranking deste navegador.';

  }

  resultStatus.textContent = saveError || '';

  const summarize = player => {
    const total = player.results.perfect + player.results.great + player.results.good + player.results.miss + player.results.special;
    const weighted = player.results.perfect + player.results.great * .75 + player.results.good * .5 + player.results.special;
    const accuracy = total ? (weighted / total * 100) : 0;
    return { total, accuracy };
  };

  const p1Summary = summarize(players.p1);
  const p2Summary = mode === 2 ? summarize(players.p2) : null;

  const winnerId = mode === 2
    ? (players.p1.score === players.p2.score ? 'EMPATE' : (players.p1.score > players.p2.score ? 'P1' : 'P2'))
    : 'P1';

  const winnerPlayer = winnerId === 'P2' ? players.p2 : players.p1;
  const winnerSummary = winnerId === 'P2' ? p2Summary : p1Summary;

  const accuracy = winnerSummary?.accuracy ?? p1Summary.accuracy;
  const grade = accuracy >= 95 ? 'S' : accuracy >= 88 ? 'A' : accuracy >= 76 ? 'B' : accuracy >= 60 ? 'C' : 'D';

  document.querySelector('#resultTitle').textContent = winnerId === 'EMPATE' ? 'EMPATE!' : 'VITÓRIA!';

  const grid = document.querySelector('#resultGrid');
  const combo = winnerPlayer?.maxCombo ?? players.p1.maxCombo;
  const score = winnerPlayer?.score ?? players.p1.score;

  grid.innerHTML = `
    <div class="victoryIdentityBar">
      <strong>⚡ ${winnerId === 'EMPATE' ? 'P1 E P2 DANÇARAM!' : winnerId + ' DANCE!'}</strong>
      <span>${SONGS[selectedSong].title} · ${DIFFICULTIES[selectedDifficulty].label} · ${mode === 2 ? 'MULTIPLAYER' : 'UM JOGADOR'}</span>
    <\/div>
    <div class="victorySummary">
      <div class="victoryStatsCard">
        <div class="statRow">
          <span class="statLabel">PONTUAÇÃO<\/span>
          <span class="statValue">${score.toLocaleString('pt-BR')}<\/span>
        <\/div>
        <div class="statRow">
          <span class="statLabel">PRECISÃO<\/span>
          <span class="statValue">${accuracy.toFixed(1).replace('.', ',')}%<\/span>
        <\/div>
        <div class="statRow">
          <span class="statLabel">COMBO<\/span>
          <span class="statValue">${combo}<\/span>
        <\/div>
      <\/div>

      <div class="victoryRankCard">
        <div class="rankHalo"><span class="rankLetter">${grade}<\/span><\/div>
        <div class="rankCaption">CLASSIFICAÇÃO FINAL<\/div>
      <\/div>
    <\/div>
    ${mode === 2 ? `
      <div class="miniOpponentCard">
        <div class="miniOpponent">
          <strong>P1<\/strong>
          <span>Pontos: ${players.p1.score.toLocaleString('pt-BR')}<\/span>
          <span>Precisão: ${p1Summary.accuracy.toFixed(1).replace('.', ',')}%<\/span>
          <span>Combo: ${players.p1.maxCombo}<\/span>
        <\/div>
        <div class="miniOpponent">
          <strong>P2<\/strong>
          <span>Pontos: ${players.p2.score.toLocaleString('pt-BR')}<\/span>
          <span>Precisão: ${p2Summary.accuracy.toFixed(1).replace('.', ',')}%<\/span>
          <span>Combo: ${players.p2.maxCombo}<\/span>
        <\/div>
      <\/div>
    ` : ''}
  `;

  hud.style.display = 'none';
  startResultCelebration(winnerId);
  resultOverlay.classList.remove('hidden');
  startResultThemeMusic();

}

function resultPanel(

  player,
  label,
  color
){

  const total =
    player.results.perfect +
    player.results.great +
    player.results.good +
    player.results.miss +
    player.results.special;

  const weighted =
    player.results.perfect +
    player.results.great * .75 +
    player.results.good * .5 +
    player.results.special;

  const accuracy =
    total
      ? (
          weighted /
          total *
          100
        )
      : 0;

  const div =
    document.createElement(
      'div'
    );

  div.className =
    'resultPanel ' +
    color;

  div.innerHTML =
    `
      <h3>
        ${label} ·
        ${player.score.toLocaleString('pt-BR')} pts
      </h3>

      <div>
        <span>Perfeito</span>
        <b>${player.results.perfect}</b>
      </div>

      <div>
        <span>Ótimo</span>
        <b>${player.results.great}</b>
      </div>

      <div>
        <span>Bom</span>
        <b>${player.results.good}</b>
      </div>

      <div>
        <span>Especial X</span>
        <b>${player.results.special}</b>
      </div>

      <div>
        <span>Erros</span>
        <b>${player.results.miss}</b>
      </div>

      <div>
        <span>Maior combo</span>
        <b>${player.maxCombo}</b>
      </div>

      <div>
        <span>Precisão</span>
        <b>${accuracy.toFixed(1)}%</b>
      </div>
    `;

  return div;

}


Object.assign(globalThis, {
  startCompletionCelebration,
  updateCompletionSequence,
  finishCompletionCelebration,
  centerModelAtX,
  startResultCelebration,
  updateResultCelebration,
  showNormalResults,
  resultPanel
});
