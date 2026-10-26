/*
  Entrada por ponteiro para o Meta Quest: o laser do controle (gatilho) ou a
  pinça da mão disparam `pointerdown` na pista apontada. A coluna inteira é
  área de toque, porque mirar só no receptor com o laser é impreciso.
  Sem import de state.js: só usa o estado global no momento do evento.
*/

/* Índice da pista sob `x`; fora delas, a mais próxima (o vão entre pistas conta). */
export function laneFromPoint(x, rects){
  let best = -1;
  let bestDistance = Infinity;
  rects.forEach((rect, index) => {
    if(!rect || rect.width <= 0) return;
    const distance =
      x < rect.left ? rect.left - x :
      x > rect.right ? x - rect.right :
      0;
    if(distance < bestDistance){
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

function bindBoard(board, playerId){
  const lanesElement = board?.querySelector('.lanes');
  if(!lanesElement) return;
  const lanes = [
    ...lanesElement.querySelectorAll('.lane:not(.specialLane)'),
    lanesElement.querySelector('.specialLane')
  ];

  lanesElement.addEventListener('pointerdown', event => {
    if(event.button > 0) return;
    event.preventDefault();
    const index = laneFromPoint(
      event.clientX,
      lanes.map(lane => lane?.getBoundingClientRect())
    );
    if(index < 0) return;
    pressPlayerLane(playerId, index === 4 ? 'special' : index);
  });
}

export function initPointerInput(){
  if(!globalThis.isQuestBrowser) return;
  bindBoard(document.querySelector('#boardP1'), 'p1');
  bindBoard(document.querySelector('#boardP2'), 'p2');
}

globalThis.initPointerInput = initPointerInput;
