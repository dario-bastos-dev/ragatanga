import '../core/state.js';

/*
  Ponto único de entrada da partida: teclado, ponteiro (Meta Quest) e
  gamepad chamam estas funções, então as regras ficam iguais para todos.
*/
export function togglePause(){
  if(gamePaused){
    resumeGame();
  }else{
    pauseGame();
  }
}

/* `lane` é o índice 0–3 da pista ou 'special' (X / Enter no Extremo). */
export function pressPlayerLane(
  playerId,
  lane
){

  if(
    gamePaused ||
    !running ||
    (playerId === 'p2' && mode !== 2)
  ){
    return;
  }

  const player =
    players[playerId];

  if(lane === 'special'){

    if(
      DIFFICULTIES[selectedDifficulty].special
    ){
      handleSpecialInput(
        player,
        playerId === 'p1'
          ? 'X'
          : 'Enter'
      );
    }

    return;

  }

  handleInput(
    player,
    (
      playerId === 'p1'
        ? P1_KEYS
        : P2_KEYS
    )[lane]
  );

}

export function initInput(){
  addEventListener(
    'keydown',
    event => {

      if(event.key === 'Escape'){

        event.preventDefault();

        togglePause();

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

          pressPlayerLane(
            'p1',
            'special'
          );

          return;

        }

        if(
          mode === 2 &&
          event.key === 'Enter'
        ){

          event.preventDefault();

          pressPlayerLane(
            'p2',
            'special'
          );

          return;

        }

      }

      if(
        P1_KEYS.includes(
          upper
        )
      ){

        pressPlayerLane(
          'p1',
          P1_KEYS.indexOf(upper)
        );

      }

      if(
        mode === 2 &&
        P2_KEYS.includes(
          event.key
        )
      ){

        event.preventDefault();

        pressPlayerLane(
          'p2',
          P2_KEYS.indexOf(event.key)
        );

      }

    }
  );
}

Object.assign(globalThis, {
  initInput,
  togglePause,
  pressPlayerLane
});
