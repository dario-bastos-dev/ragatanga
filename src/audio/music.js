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


Object.assign(globalThis, {
  playMissSound,
  seekMusicTo
});
