import '../core/state.js';

function updateModeButtons(){

  const one = document.querySelector('#onePlayer');
  const two = document.querySelector('#twoPlayers');

  one.classList.toggle('selected', menuSelectedMode === 1);
  two.classList.toggle('selected', menuSelectedMode === 2);

  if(startGameButton){
    startGameButton.textContent = menuSelectedMode === 2
      ? 'INICIAR DANÇA · 2 JOGADORES'
      : 'INICIAR DANÇA';
  }

}

function updateMenuPreviewText(song){

  if(!songChosenByUser || !song){
    menuPreviewTitle.textContent = 'SELECIONE UMA MÚSICA';
    menuPreviewSubtitle.textContent = 'O personagem P1 aparece à esquerda e faz uma prévia da coreografia assim que você escolher uma música.';
    return;
  }

  menuPreviewTitle.textContent = song.title;
  menuPreviewSubtitle.textContent = 'Prévia de 10 segundos da coreografia com volume reduzido.';

}

function stopMenuPreview(){

  menuPreviewState.active = false;
  menuPreviewState.previewingSong = null;

  try{
    music.pause();
  }catch(error){}

  music.loop = false;
  music.volume = 1;

  document.querySelectorAll('.songCard').forEach(card => card.classList.remove('previewing'));

}

function getMenuIdleClipForDancer(dancer){

  if(!dancer){
    return null;
  }

  return dancer.menuIdleClip || menuIdleClip || dancer.idleAction?._clip || null;

}

function ensureMenuIdleAction(dancer){

  if(!dancer){
    return null;
  }

  const clip = getMenuIdleClipForDancer(dancer);

  if(!clip){
    return dancer.idleAction || null;
  }

  if(dancer.menuIdleAction && dancer.menuIdleAction.getClip() === clip){
    return dancer.menuIdleAction;
  }

  if(dancer.menuIdleAction){
    dancer.menuIdleAction.stop();
  }

  const action = dancer.mixer.clipAction(clip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.clampWhenFinished = false;
  action.enabled = true;
  action.play();
  dancer.menuIdleAction = action;
  return action;

}

function setMenuIdlePose(dancer, fadeSeconds = MENU_ANIMATION_FADE_SECONDS){

  if(!dancer){
    return;
  }

  const idle = ensureMenuIdleAction(dancer);
  const dance = dancer.action;

  if(!idle){
    if(dance){
      dance.reset();
      dance.enabled = true;
      dance.setEffectiveWeight(1);
      dance.paused = true;
      dance.play();
      dancer.mixer.setTime(0);
    }
    return;
  }

  idle.enabled = true;
  idle.paused = false;
  idle.setEffectiveWeight(1);
  idle.play();

  if(dance && dance !== idle){
    dance.enabled = true;
    dance.paused = false;
    dance.play();
    if(fadeSeconds > 0){
      dance.crossFadeTo(idle, fadeSeconds, false);
    }else{
      dance.setEffectiveWeight(0);
      idle.setEffectiveWeight(1);
    }
  }

  if(dancer.idleAction && dancer.idleAction !== idle){
    dancer.idleAction.setEffectiveWeight(0);
  }

  dancer.enabled = false;
  dancer.menuState = 'idle';

}

function beginMenuDanceTransition(dancer){

  if(!dancer?.action){
    return;
  }

  const idle = ensureMenuIdleAction(dancer);
  const dance = dancer.action;

  dance.reset();
  dance.enabled = true;
  dance.paused = false;
  dance.setLoop(THREE.LoopRepeat, Infinity);
  dance.setEffectiveWeight(idle ? 0 : 1);
  dance.play();

  if(idle){
    idle.reset();
    idle.enabled = true;
    idle.paused = false;
    idle.setEffectiveWeight(1);
    idle.play();
    idle.crossFadeTo(dance, MENU_ANIMATION_FADE_SECONDS, false);
  }

  if(dancer.idleAction && dancer.idleAction !== idle){
    dancer.idleAction.setEffectiveWeight(0);
  }

  dancer.enabled = true;
  dancer.menuState = 'preview';

}

function finishMenuPreview(){

  menuPreviewState.active = false;
  menuPreviewState.previewingSong = selectedSong;

  try{
    music.pause();
  }catch(error){}

  music.volume = MENU_PREVIEW_VOLUME;
  document.querySelectorAll('.songCard').forEach(card => card.classList.remove('previewing'));

  const dancer = dancers.p1;

  if(!dancer){
    return;
  }

  setMenuIdlePose(dancer, 0);
  menuPreviewState.lastAt = performance.now();

  if(menuPreviewSubtitle){
    menuPreviewSubtitle.textContent = 'Prévia concluída · clique novamente na música para rever ou pressione INICIAR DANÇA.';
  }

  resumeMenuThemeMusic();

}

function showMenuCharacterWaiting(){

  if(!scene || !p1Loaded || running || preRolling){
    return;
  }

  stopMenuPreview();
  resetSceneDancers();
  ringP2.visible = false;

  /*
    Evita o bug visual em que o personagem reaparecia congelado no primeiro
    frame da coreografia antes do Idle terminar de carregar.
  */
  if(!menuIdleClip){
    ringP1.visible = false;
    return;
  }

  ringP1.visible = true;
  ringP1.position.x = MENU_CHARACTER_X;

  try{
    createP1(MENU_CHARACTER_X);

    const dancer = dancers.p1;

    if(!dancer){
      ringP1.visible = false;
      return;
    }

    dancer.mixer.stopAllAction();
    dancer.menuIdleAction = null;

    const idle = ensureMenuIdleAction(dancer);

    if(!idle){
      dancer.object.visible = false;
      ringP1.visible = false;
      return;
    }

    dancer.object.visible = true;
    idle.reset();
    idle.enabled = true;
    idle.paused = false;
    idle.setEffectiveWeight(1);
    idle.setLoop(THREE.LoopRepeat, Infinity);
    idle.play();

    if(dancer.action && dancer.action !== idle){
      dancer.action.stop();
      dancer.action.setEffectiveWeight(0);
    }

    dancer.enabled = false;
    dancer.menuState = 'idle';
    dancer.mixer.update(0);
    menuPreviewState.lastAt = performance.now();

  }catch(error){
    ringP1.visible = false;
    console.error('Não foi possível preparar o personagem do menu.', error);
  }

}

function canStartSelectedSong(){

  const danceReady = !SONGS[selectedSong].dance || Boolean(danceFiles[selectedSong]);
  const preMatchReady = Boolean(preMatchClips.p1 && preMatchClips.p2);
  const completionReady = Boolean(completionClips.p1 && completionClips.p2);
  const gameplayIdleReady = Boolean(menuIdleClip);
  const thrillerSkinReady = selectedSong !== 'thriller' || Boolean(thrillerModels.p1 && thrillerModels.p2);
  const outcomeAnimationsReady = Boolean(defeatClip && victoryClip);

  return (
    p1Loaded &&
    music.readyState >= 2 &&
    danceReady &&
    preMatchReady &&
    completionReady &&
    gameplayIdleReady &&
    outcomeAnimationsReady &&
    thrillerSkinReady &&
    !musicError &&
    !characterError
  );

}

function updateStartButtonState(){

  const ready = canStartSelectedSong();

  if(startGameButton){
    startGameButton.disabled = !(ready && songChosenByUser);
  }

  updateModeButtons();

  if(menu.style.display === 'none'){
    return;
  }

  if(songChosenByUser && ready){
    if(menuPreviewState.previewingSong !== selectedSong){
      startMenuPreview();
    }
  }else if(!songChosenByUser && !dancers.p1 && p1Loaded){
    showMenuCharacterWaiting();
  }

}

async function startMenuPreview(){

  if(!songChosenByUser || !canStartSelectedSong() || !scene || running || preRolling){
    return;
  }

  stopMenuThemeMusic(false);
  stopMenuPreview();
  resetSceneDancers();
  ringP2.visible = false;
  ringP1.visible = true;
  ringP1.position.x = MENU_CHARACTER_X;

  try{
    createP1(MENU_CHARACTER_X);
  }catch(error){
    console.error('Não foi possível criar o preview do menu.', error);
    return;
  }

  const dancer = dancers.p1;

  if(dancer){
    dancer.mixer.stopAllAction();
    beginMenuDanceTransition(dancer);
    dancer.blend = 1;
  }

  try{
    await seekMusicTo(AUDIO_START);
  }catch(error){}

  music.volume = MENU_PREVIEW_VOLUME;
  music.loop = false;
  music.play().catch(() => {});

  menuPreviewState.active = true;
  menuPreviewState.startedAt = performance.now();
  menuPreviewState.lastAt = performance.now();
  menuPreviewState.previewingSong = selectedSong;

  document.querySelectorAll('.songCard').forEach(card => {
    card.classList.toggle('previewing', card.dataset.song === selectedSong);
  });

  updateMenuPreviewText(SONGS[selectedSong]);

}

function updateMenuPreview(){

  if(menu.style.display === 'none' || running || preRolling){
    return;
  }

  const now = performance.now();

  if(menuPreviewState.active && dancers.p1){

    const delta = menuPreviewState.lastAt
      ? Math.min(.06, Math.max(0, (now - menuPreviewState.lastAt) / 1000))
      : 0;

    menuPreviewState.lastAt = now;

    const elapsed = (now - menuPreviewState.startedAt) / 1000;
    const previewTime = Math.min(elapsed, MENU_PREVIEW_SECONDS);
    const remaining = Math.max(0, Math.ceil(MENU_PREVIEW_SECONDS - elapsed));
    const dancer = dancers.p1;
    const idle = ensureMenuIdleAction(dancer);
    const dance = dancer.action;

    if(menuPreviewSubtitle){
      menuPreviewSubtitle.textContent = `Prévia do refrão · ${remaining}s · volume reduzido`;
    }

    dancer.mixer.update(delta);

    if(dance){
      const mappedTime = danceTime(previewTime, dancer.clip.duration);
      dance.time = mappedTime;
    }

    const fadeIn = THREE.MathUtils.clamp(elapsed / MENU_ANIMATION_FADE_SECONDS, 0, 1);
    const fadeOut = THREE.MathUtils.clamp((MENU_PREVIEW_SECONDS - elapsed) / MENU_ANIMATION_FADE_SECONDS, 0, 1);
    const danceWeight = Math.min(fadeIn, fadeOut);

    if(dance){
      dance.setEffectiveWeight(danceWeight);
    }
    if(idle){
      idle.setEffectiveWeight(1 - danceWeight);
    }

    /* O áudio acompanha a saída da coreografia para evitar corte seco. */
    music.volume = MENU_PREVIEW_VOLUME * Math.min(1, fadeOut * 1.35);

    if(elapsed >= MENU_PREVIEW_SECONDS || music.currentTime >= AUDIO_START + MENU_PREVIEW_SECONDS - .02){
      finishMenuPreview();
    }

    return;
  }

  if(dancers.p1){

    const delta = menuPreviewState.lastAt
      ? Math.min(.06, Math.max(0, (now - menuPreviewState.lastAt) / 1000))
      : 0;

    menuPreviewState.lastAt = now;
    const idle = ensureMenuIdleAction(dancers.p1);
    if(idle){
      idle.setEffectiveWeight(1);
      dancers.p1.mixer.update(delta);
    }

  }

}

function initSongMenu(){

  document
    .querySelectorAll('.songCard')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {
            songChosenByUser = true;
            menuPreviewState.previewingSong = null;
            selectSong(
              button.dataset.song
            );
          }
        );

      }
    );

  music.addEventListener(
    'error',
    () => {

      musicError = true;

      document
        .querySelector('#onePlayer')
        .disabled = true;

      document
        .querySelector('#twoPlayers')
        .disabled = true;

      document
        .querySelector('#menuStatus')
        .textContent =
          'Áudio não encontrado: ' +
          SONGS[selectedSong].audio;

    }
  );

  music.addEventListener(
    'loadeddata',
    updateMenuAvailability
  );

  /* Garante o fim da partida se o áudio acabar antes da janela. */
  music.addEventListener(
    'ended',
    finish
  );

  selectSong(selectedSong);

  document.querySelectorAll('.songCard').forEach(item => item.classList.remove('active'));
  updateMenuPreviewText(null);
  updateModeButtons();
  showMenuCharacterWaiting();
  updateStartButtonState();

}

function selectSong(id){

  const song =
    SONGS[id];

  if(!song){
    return;
  }

  if(songChosenByUser){
    stopMenuThemeMusic(false);
  }

  if(menuPreviewState.active){
    stopMenuPreview();
  }

  selectedSong = id;

  beatmap = song.beatmap;
  AUDIO_START = beatmap.audioStart;
  AUDIO_END = beatmap.audioEnd;
  GAME_DURATION = beatmap.duration;

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
      formatTime(AUDIO_START);

  document
    .querySelector('#progressEnd')
    .textContent =
      formatTime(AUDIO_END);

  musicError = false;

  applyStageBackground(song);
  applyStageLook(id);

  music.src =
    song.audio;

  music.load();

  loadSongDance(id);

  updateDifficultyInfo();
  updateMenuPreviewText(song);
  updateMenuAvailability();
  updateStartButtonState();

}

function initDifficultyMenu(){

  document
    .querySelectorAll('.difficultyCard')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            selectedDifficulty =
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
    DIFFICULTIES[selectedDifficulty];

  const noteCount =
    Math.ceil(
      beatmap.beats.length /
      config.beatStep
    );

  let extra = '';

  if(config.special){
    extra =
      ` + ~${Math.floor(beatmap.beats.length / 8)} hits X`;
  }

  document
    .querySelector('#difficultyInfo')
    .textContent =
      `${config.label} · ${noteCount} hits musicais${extra} · ${config.description} · derrota com ${config.missLimit} erros seguidos`;

}

function updateMenuAvailability(){

  const one =
    document.querySelector('#onePlayer');

  const two =
    document.querySelector('#twoPlayers');

  /*
    P1 e P2 agora usam exatamente o mesmo asset.
    Assim que o Samba Dancing carregar,
    os dois modos ficam disponíveis.
  */
  const danceReady =
    !SONGS[selectedSong].dance ||
    Boolean(danceFiles[selectedSong]);

  const preMatchReady =
    Boolean(
      preMatchClips.p1 &&
      preMatchClips.p2
    );

  const completionReady =
    Boolean(
      completionClips.p1 &&
      completionClips.p2
    );

  /*
    A animação de espera também é usada durante a partida quando há MISS.
    Não liberamos o início até ela estar pronta, evitando o antigo estado
    em que Ragatanga/Macarena/YMCA congelavam o personagem.
  */
  const gameplayIdleReady =
    Boolean(menuIdleClip);

  const thrillerSkinReady =
    selectedSong !== 'thriller' ||
    Boolean(
      thrillerModels.p1 &&
      thrillerModels.p2
    );

  const outcomeAnimationsReady =
    Boolean(
      defeatClip &&
      victoryClip
    );

  const ready =
    p1Loaded &&
    music.readyState >= 2 &&
    danceReady &&
    preMatchReady &&
    completionReady &&
    outcomeAnimationsReady &&
    thrillerSkinReady;

  one.disabled = false;
  two.disabled = false;
  one.classList.toggle('is-ready', ready);
  two.classList.toggle('is-ready', ready);

  if(ready){

    document
      .querySelector('#menuStatus')
      .textContent =
        `Pronto · ${beatmap.beatCount} batidas mapeadas · ${beatmap.detectedBpm.toFixed(1)} BPM`;

  }else{

    let status =
      'Carregando música…';

    if(characterError){
      status = 'Não foi possível carregar o P1.';
    }else if(
      selectedSong === 'thriller' &&
      thrillerCharacterErrors.size
    ){
      status = 'Não foi possível preparar uma skin da fase Thriller.';
    }else if(
      selectedSong === 'thriller' &&
      (!thrillerModels.p1 || !thrillerModels.p2)
    ){
      status = 'Carregando skins Michael e ZombieGirl…';
    }else if(danceErrors.has(selectedSong)){
      status = 'Não foi possível carregar a coreografia.';
    }else if(musicError){
      status = 'Áudio não encontrado: ' + SONGS[selectedSong].audio;
    }else if(!p1Loaded){
      status = 'Carregando personagem 3D…';
    }else if(preMatchAnimationErrors.size){
      status = 'Não foi possível carregar uma animação de pré-partida.';
    }else if(!preMatchReady){
      status = 'Carregando animações de pré-partida…';
    }else if(completionAnimationErrors.size){
      status = 'Não foi possível carregar uma animação de comemoração.';
    }else if(!completionReady){
      status = 'Carregando animações de comemoração…';
    }else if(menuIdleAnimationError){
      status = 'Não foi possível preparar a animação de espera.';
    }else if(!gameplayIdleReady){
      status = 'Carregando animação de espera…';
    }else if(!outcomeAnimationsReady){
      status = 'Carregando animações de derrota e vitória…';
    }else if(!danceReady){
      status = 'Carregando coreografia…';
    }

    document
      .querySelector('#menuStatus')
      .textContent =
        status;

  }

  updateStartButtonState();

}


Object.assign(globalThis, {
  updateModeButtons,
  updateMenuPreviewText,
  stopMenuPreview,
  getMenuIdleClipForDancer,
  ensureMenuIdleAction,
  setMenuIdlePose,
  beginMenuDanceTransition,
  finishMenuPreview,
  showMenuCharacterWaiting,
  canStartSelectedSong,
  updateStartButtonState,
  startMenuPreview,
  updateMenuPreview,
  initSongMenu,
  selectSong,
  initDifficultyMenu,
  updateDifficultyInfo,
  updateMenuAvailability
});
