import {
  state,
  currentSong,
  currentDifficulty
} from '../core/state.js';

import {
  seededRandom
} from '../core/utils.js';

/*
  Gera a sequência de notas da partida a partir das batidas do beatmap:
  coluna de cada jogador por batida e, no EXTREMO, os especiais.
*/
export function buildDifficultyEvents(){

  const config =
    currentDifficulty();

  const beats =
    state.beatmap.beats;

  const song =
    currentSong();

  const selectedBeats = [];

  for(
    let i = 0;
    i < beats.length;
    i += config.beatStep
  ){

    selectedBeats.push({
      sourceBeatIndex: i,
      time: beats[i]
    });

  }

  const randomP1 =
    seededRandom(song.seedP1);

  const randomP2 =
    seededRandom(song.seedP2);

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
      i < beats.length - 1;
      i += 8
    ){

      const time =
        (
          beats[i] +
          beats[i + 1]
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
