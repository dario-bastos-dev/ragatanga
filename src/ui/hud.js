import '../core/state.js';

function updatePerformanceMeter(
  player
){

  if(!player){
    return;
  }

  const suffix =
    player.id.toUpperCase();

  const meter =
    document.querySelector(
      '#performance' + suffix
    );

  const needle =
    document.querySelector(
      '#performanceNeedle' + suffix
    );

  const status =
    document.querySelector(
      '#performanceStatus' + suffix
    );

  if(
    !meter ||
    !needle ||
    !status
  ){
    return;
  }

  const limit =
    DIFFICULTIES[
      selectedDifficulty
    ].missLimit;

  /*
    Faixas proporcionais ao limite da dificuldade.
    Exemplo no Fácil (10 erros):
    0-3 = verde, 4-6 = amarelo, 7-10 = vermelho.
  */
  const greenMax =
    Math.max(
      1,
      Math.floor(limit * .3)
    );

  const yellowMax =
    Math.max(
      greenMax + 1,
      Math.floor(limit * .6)
    );

  const misses =
    Math.max(
      0,
      Math.min(
        limit,
        player.consecutiveMisses
      )
    );

  const progress =
    limit > 0
      ? misses / limit
      : 0;

  /*
    A performance boa fica à direita (verde) e o perigo à esquerda (vermelho).
    Com 0 erros a seta começa em 98%; ao atingir o limite chega a 2%.
    A pequena margem mantém a seta inteira dentro da barra.
  */
  const needlePercent =
    98 - progress * 96;

  needle.style.left =
    needlePercent + '%';

  let state = 'green';
  let label = 'ÓTIMA';

  if(misses > yellowMax){
    state = 'red';
    label = 'PERIGO';
  }else if(misses > greenMax){
    state = 'yellow';
    label = 'ATENÇÃO';
  }

  /*
    A partir de 80% do limite, a barra e a seta tremem para comunicar
    que faltam poucos erros consecutivos para a derrota.
  */
  const criticalThreshold =
    Math.max(
      yellowMax + 1,
      Math.ceil(limit * .8)
    );

  const critical =
    misses >= criticalThreshold;

  if(critical){
    label = 'PERIGO!';
  }

  meter.dataset.state = state;
  meter.classList.toggle(
    'critical',
    critical
  );
  status.textContent = label;

  const greenMarker =
    document.querySelector(
      '#performanceGreen' + suffix
    );

  const yellowMarker =
    document.querySelector(
      '#performanceYellow' + suffix
    );

  const limitMarker =
    document.querySelector(
      '#performanceLimit' + suffix
    );

  if(greenMarker){
    greenMarker.textContent =
      greenMax;
  }

  if(yellowMarker){
    yellowMarker.textContent =
      yellowMax;
  }

  if(limitMarker){
    limitMarker.textContent =
      limit;
  }

}

function updatePlayerHud(
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

  const missCounter =
    document.querySelector(
      '#miss' +
      player.id.toUpperCase()
    );

  if(missCounter){

    const limit =
      DIFFICULTIES[selectedDifficulty].missLimit;

    missCounter.textContent =
      `ERROS SEGUIDOS ${player.consecutiveMisses}/${limit}`;

    missCounter.classList.toggle(
      'danger',
      player.consecutiveMisses >= Math.ceil(limit * .7)
    );

  }

  updatePerformanceMeter(player);

}

function pulseReceptor(
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

function pulseSpecial(
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

function animateNote(
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

function showJudgement(
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

function triggerShake(){

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


Object.assign(globalThis, {
  updatePerformanceMeter,
  updatePlayerHud,
  pulseReceptor,
  pulseSpecial,
  animateNote,
  showJudgement,
  triggerShake
});
