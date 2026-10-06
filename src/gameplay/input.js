import {
  P1_KEYS,
  P2_KEYS
} from '../config/gameplay.js';

import {
  state,
  hasSpecialLane
} from '../core/state.js';

import {
  handleInput,
  handleSpecialInput
} from './judge.js';

/*
  Teclado: P1 = A W S D (+ X no EXTREMO),
  P2 = setas (+ Enter no EXTREMO).
*/
export function initInput(){

  addEventListener(
    'keydown',
    event => {

      if(
        !state.running ||
        event.repeat
      ){
        return;
      }

      const players =
        state.players;

      const upper =
        event.key.toUpperCase();

      if(hasSpecialLane()){

        if(
          upper === 'X'
        ){

          handleSpecialInput(
            players.p1,
            'X'
          );

          return;

        }

        if(
          state.mode === 2 &&
          event.key === 'Enter'
        ){

          event.preventDefault();

          handleSpecialInput(
            players.p2,
            'Enter'
          );

          return;

        }

      }

      if(
        P1_KEYS.includes(
          upper
        )
      ){

        handleInput(
          players.p1,
          upper
        );

      }

      if(
        state.mode === 2 &&
        P2_KEYS.includes(
          event.key
        )
      ){

        event.preventDefault();

        handleInput(
          players.p2,
          event.key
        );

      }

    }
  );

}
