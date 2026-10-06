import {
  P1_KEYS,
  P2_LABELS,
  LANE_X,
  EXTREME_LANE_X,
  SPECIAL_LANE_X
} from '../config/gameplay.js';

import {
  state,
  currentDifficulty
} from '../core/state.js';

/*
  Cria um jogador com suas notas (elementos na pista) e placar zerado.
*/
export function makePlayer(
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
            state.difficulty === 'extreme'
              ? EXTREME_LANE_X[lane]
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

  if(currentDifficulty().special){

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
        SPECIAL_LANE_X + '%';

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
    results: {
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      special: 0
    }
  };

}
