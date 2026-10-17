import '../core/state.js';

export function initInput(){
  addEventListener(
    'keydown',
    event => {

      if(event.key === 'Escape'){

        event.preventDefault();

        if(gamePaused){
          resumeGame();
        }else{
          pauseGame();
        }

        return;

      }

      if(
        gamePaused ||
        !running ||
        event.repeat
      ){
        return;
      }

      const upper =
        event.key.toUpperCase();

      if(
        DIFFICULTIES[selectedDifficulty].special
      ){

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
          mode === 2 &&
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
        mode === 2 &&
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

globalThis.initInput = initInput;
