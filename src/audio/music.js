import '../core/state.js';

function playMissSound(){

  if(!missSoundTemplates.length){
    return;
  }

  let index =
    Math.floor(
      Math.random() *
      missSoundTemplates.length
    );

  /*
    Evita repetir exatamente o mesmo efeito duas vezes seguidas
    quando existem outras opções disponíveis.
  */
  if(
    missSoundTemplates.length > 1 &&
    index === lastMissSoundIndex
  ){
    index =
      (
        index +
        1 +
        Math.floor(
          Math.random() *
          (missSoundTemplates.length - 1)
        )
      ) %
      missSoundTemplates.length;
  }

  lastMissSoundIndex = index;

  const sound =
    missSoundTemplates[
      index
    ].cloneNode(true);

  sound.volume = .54;
  sound.currentTime = 0;

  sound
    .play()
    .catch(
      () => {
        /* O navegador pode bloquear áudio antes da primeira interação. */
      }
    );

}

async function seekMusicTo(
  seconds
){

  if(music.readyState < 1){

    await new Promise(
      resolve => {

        const done = () => {
          music.removeEventListener('loadedmetadata', done);
          resolve();
        };

        music.addEventListener(
          'loadedmetadata',
          done,
          { once: true }
        );

        setTimeout(done, 1200);

      }
    );

  }

  if(
    Math.abs(music.currentTime - seconds) < .015
  ){
    return;
  }

  await new Promise(
    resolve => {

      let settled = false;

      const done = () => {

        if(settled){
          return;
        }

        settled = true;
        music.removeEventListener('seeked', done);
        resolve();

      };

      music.addEventListener(
        'seeked',
        done,
        { once: true }
      );

      try{
        music.currentTime = seconds;
      }catch(error){
        console.warn('Falha ao posicionar áudio:', error);
        done();
        return;
      }

      setTimeout(done, 700);

    }
  );

}


function createSoundTemplate(
  url,
  volume
){

  const sound = new Audio(url);
  sound.preload = 'auto';
  sound.volume = volume;
  return sound;

}

const menuThemeSound =
  createSoundTemplate(
    MENU_THEME_SOUND_URL,
    MENU_THEME_VOLUME
  );

menuThemeSound.loop = true;

let menuThemeAutoplayArmed = false;

function isMenuThemeAllowed(){

  return (
    menu &&
    menu.style.display !== 'none' &&
    !running &&
    !preRolling &&
    !menuPreviewState.active
  );

}

function stopMenuThemeMusic(reset = false){

  try{
    menuThemeSound.pause();
    if(reset){
      menuThemeSound.currentTime = 0;
    }
  }catch(error){}

}

async function startMenuThemeMusic({ restart = false } = {}){

  if(!isMenuThemeAllowed()){
    return false;
  }

  try{
    if(restart || menuThemeSound.ended){
      menuThemeSound.currentTime = 0;
    }
    menuThemeSound.volume = MENU_THEME_VOLUME;
    await menuThemeSound.play();
    return true;
  }catch(error){
    return false;
  }

}

function armMenuThemeAutoplayFallback(){

  if(menuThemeAutoplayArmed){
    return;
  }

  menuThemeAutoplayArmed = true;

  const tryStart = event => {

    if(event?.target?.closest?.('.songCard')){
      return;
    }

    if(!isMenuThemeAllowed()){
      return;
    }

    startMenuThemeMusic({ restart: menuThemeSound.currentTime <= .05 })
      .then(started => {
        if(started){
          document.removeEventListener('pointerdown', tryStart);
          document.removeEventListener('keydown', tryStart);
          menuThemeAutoplayArmed = false;
        }
      });

  };

  document.addEventListener('pointerdown', tryStart);
  document.addEventListener('keydown', tryStart);

}

async function initMenuThemeMusic(){

  menuThemeSound.currentTime = 0;
  menuThemeSound.volume = MENU_THEME_VOLUME;

  const started = await startMenuThemeMusic({ restart: true });

  if(!started){
    armMenuThemeAutoplayFallback();
  }

}

function resumeMenuThemeMusic(){

  if(!isMenuThemeAllowed()){
    return;
  }

  /*
    O preview pausa a trilha do menu sem alterar currentTime. Ao terminar,
    retomamos exatamente do ponto em que ela estava, preservando o loop
    musical contínuo do menu.
  */
  startMenuThemeMusic({ restart: false })
    .then(started => {
      if(!started){
        armMenuThemeAutoplayFallback();
      }
    });

}

async function startResultThemeMusic(){

  /*
    A tela final utiliza a mesma trilha ambiente do menu, no mesmo volume.
    Aqui ignoramos a regra de visibilidade do menu principal porque o painel
    de resultados é uma experiência de menu própria.
  */
  try{
    menuThemeSound.pause();
    menuThemeSound.currentTime = 0;
    menuThemeSound.volume = MENU_THEME_VOLUME;
    await menuThemeSound.play();
    return true;
  }catch(error){
    return false;
  }

}

const menuSelectSoundTemplate =
  createSoundTemplate(
    MENU_SELECT_SOUND_URL,
    .48
  );

const pauseSoundTemplate =
  createSoundTemplate(
    PAUSE_SOUND_URL,
    .52
  );

const startDanceSoundTemplate =
  createSoundTemplate(
    START_DANCE_SOUND_URL,
    .64
  );

const crowdCelebrationSound =
  createSoundTemplate(
    CROWD_CELEBRATION_SOUND_URL,
    .34
  );

function playOneShotSound(
  template,
  volume = template.volume
){

  if(!template){
    return;
  }

  const sound = template.cloneNode(true);
  sound.volume = volume;
  sound.currentTime = 0;

  sound
    .play()
    .catch(
      () => {
        /* Sons de interface dependem de uma interação válida do navegador. */
      }
    );

}

function playMenuSelectSound(){
  playOneShotSound(menuSelectSoundTemplate, .48);
}

function playPauseSound(){
  playOneShotSound(pauseSoundTemplate, .52);
}

function playStartDanceSound(){
  playOneShotSound(startDanceSoundTemplate, .64);
}

function playCrowdCelebrationSound(){

  try{
    crowdCelebrationSound.pause();
    crowdCelebrationSound.currentTime = 0;
    crowdCelebrationSound.volume = .34;
    crowdCelebrationSound.play().catch(() => {});
  }catch(error){}

}

function stopCrowdCelebrationSound(){

  try{
    crowdCelebrationSound.pause();
    crowdCelebrationSound.currentTime = 0;
  }catch(error){}

}

function playWastedSound(){

  try{
    wastedSound.pause();
    wastedSound.currentTime = 0;
    wastedSound.volume = .94;
    wastedSound.play().catch(() => {});
  }catch(error){}

}

function stopWastedSound(){

  try{
    wastedSound.pause();
    wastedSound.currentTime = 0;
  }catch(error){}

}


Object.assign(globalThis, {
  playMissSound,
  seekMusicTo,
  initMenuThemeMusic,
  startMenuThemeMusic,
  stopMenuThemeMusic,
  resumeMenuThemeMusic,
  startResultThemeMusic,
  playMenuSelectSound,
  playPauseSound,
  playStartDanceSound,
  playCrowdCelebrationSound,
  stopCrowdCelebrationSound,
  playWastedSound,
  stopWastedSound
});
