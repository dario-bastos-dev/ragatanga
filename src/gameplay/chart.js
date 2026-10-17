import '../core/state.js';

function buildDifficultyEvents(){

  const config =
    DIFFICULTIES[selectedDifficulty];

  const selectedBeats = [];

  for(
    let i = 0;
    i < beatmap.beats.length;
    i += config.beatStep
  ){

    selectedBeats.push({
      sourceBeatIndex: i,
      time: beatmap.beats[i]
    });

  }

  const randomP1 =
    seededRandom(SONGS[selectedSong].seedP1);

  const randomP2 =
    seededRandom(SONGS[selectedSong].seedP2);

  let previousP1 = -1;
  let previousP2 = -1;

  const regular =
    selectedBeats.map(
      beat => {

        let p1 =
          Math.floor(
            randomP1() * 4
          );

        if(
          p1 === previousP1 &&
          randomP1() > .25
        ){
          p1 = (p1 + 1) % 4;
        }

        let p2 =
          Math.floor(
            randomP2() * 4
          );

        /*
          No multiplayer, o P2 nunca recebe
          a mesma coluna equivalente do P1
          naquele mesmo instante.
        */
        if(p2 === p1){
          p2 = (p2 + 1 + (beat.sourceBeatIndex % 2)) % 4;
        }

        if(
          p2 === previousP2 &&
          randomP2() > .25
        ){
          p2 = (p2 + 1) % 4;

          if(p2 === p1){
            p2 = (p2 + 1) % 4;
          }
        }

        previousP1 = p1;
        previousP2 = p2;

        return {
          time: beat.time,
          p1,
          p2
        };

      }
    );

  const special = [];

  if(config.special){

    /*
      X entra no meio da batida, aproximadamente
      a cada 8 beats.

      Isso cria dificuldade extra sem transformar
      cada beat em um acorde impossível.
    */
    let specialCounter = 0;

    for(
      let i = 7;
      i < beatmap.beats.length - 1;
      i += 8
    ){

      const time =
        (
          beatmap.beats[i] +
          beatmap.beats[i + 1]
        ) /
        2;

      special.push({
        time,
        order: specialCounter++
      });

    }

  }

  return {
    regular,
    special
  };

}

function makePlayer(
  id,
  keys,
  notesLayerId,
  eventSet
){

  const layer =
    document.querySelector(
      '#' + notesLayerId
    );

  layer.innerHTML = '';

  const notes =
    eventSet.regular.map(
      (event,index) => {

        const lane =
          id === 'p1'
            ? event.p1
            : event.p2;

        const key =
          keys[lane];

        const element =
          document.createElement(
            'div'
          );

        element.className =
          'note';

        element.textContent =
          id === 'p1'
            ? P1_KEYS[lane]
            : P2_LABELS[lane];

        element.style.left =
          (
            DIFFICULTIES[selectedDifficulty].special
              ? [10,30,50,70][lane]
              : LANE_X[lane]
          ) + '%';

        element.style.display =
          'none';

        layer.appendChild(element);

        return {
          index,
          type: 'regular',
          time: event.time,
          lane,
          key,
          resolved: false,
          element
        };

      }
    );

  const specials = [];

  if(
    DIFFICULTIES[selectedDifficulty]
      .special
  ){

    for(
      const event
      of eventSet.special
    ){

      /*
        No EXTREMO os dois jogadores recebem o especial
        nos mesmos tempos musicais, porém com teclas próprias:
        P1 = X
        P2 = Enter
      */
      const specialKey =
        id === 'p1'
          ? 'X'
          : 'Enter';

      const specialLabel =
        id === 'p1'
          ? 'X'
          : 'ENTER';

      const element =
        document.createElement(
          'div'
        );

      element.className =
        id === 'p1'
          ? 'specialNote'
          : 'specialNote enterSpecialNote';

      element.textContent =
        specialLabel;

      element.style.left =
        '90%';

      element.style.display =
        'none';

      layer.appendChild(element);

      specials.push({
        type: 'special',
        time: event.time,
        key: specialKey,
        resolved: false,
        element
      });

    }

  }

  return {
    id,
    keys,
    notes,
    specials,
    noteIndex: 0,
    specialIndex: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    consecutiveMisses: 0,
    results: {
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      special: 0
    }
  };

}


Object.assign(globalThis, {
  buildDifficultyEvents,
  makePlayer
});
