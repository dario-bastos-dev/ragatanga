/*
  Controles com mapeamento "standard" da Gamepad API (Xbox/PlayStation via
  Bluetooth, que o Meta Quest aceita). O primeiro controle é o P1 e o segundo
  é o P2. As pistas seguem a ordem ← ↑ ↓ → das teclas:

    direcional ← ↑ ↓ →   ou   X Y A B (posição física)  → pistas 1–4
    LB / RB / LT / RT                                    → especial do Extremo
    Start                                                → pausa/continua

  Sem import de state.js: só usa o estado global quando há botão pressionado.
*/
export const GAMEPAD_LANES = [
  [14, 2],
  [12, 3],
  [13, 0],
  [15, 1]
];

export const GAMEPAD_SPECIAL = [4, 5, 6, 7];

export const GAMEPAD_PAUSE = 9;

/* Ações para os botões que passaram de solto para pressionado neste quadro. */
export function gamepadActions(pressed, previous = []){
  const justPressed = index => pressed[index] && !previous[index];
  const actions = [];
  if(justPressed(GAMEPAD_PAUSE)) actions.push('pause');
  GAMEPAD_LANES.forEach((buttons, lane) => {
    if(buttons.some(justPressed)) actions.push(lane);
  });
  if(GAMEPAD_SPECIAL.some(justPressed)) actions.push('special');
  return actions;
}

const previousButtons = new Map();
let polling = false;

function readGamepads(){
  try{
    return [...(navigator.getGamepads?.() ?? [])]
      .filter(pad => pad?.connected && pad.mapping === 'standard');
  }catch{
    /* Fora de contexto seguro (http na rede local) a API pode ser bloqueada. */
    return [];
  }
}

function poll(){
  const pads = readGamepads();
  if(!pads.length){
    polling = false;
    previousButtons.clear();
    return;
  }

  pads.forEach((pad, order) => {
    const pressed = pad.buttons.map(button => button.pressed);
    const actions = gamepadActions(pressed, previousButtons.get(pad.index));
    previousButtons.set(pad.index, pressed);

    for(const action of actions){
      if(action === 'pause'){
        togglePause();
      }else if(order < 2){
        pressPlayerLane(order === 0 ? 'p1' : 'p2', action);
      }
    }
  });

  requestAnimationFrame(poll);
}

export function initGamepadInput(){
  addEventListener('gamepadconnected', () => {
    if(polling) return;
    polling = true;
    requestAnimationFrame(poll);
  });
}

globalThis.initGamepadInput = initGamepadInput;
