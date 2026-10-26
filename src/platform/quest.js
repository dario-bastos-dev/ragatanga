/*
  Detecção do Meta Quest Browser.

  O navegador do Quest roda a página numa janela 2D (1280×670 por padrão) e
  não tem teclado: os controles Touch e as mãos viram um laser que dispara
  eventos de ponteiro. A Meta recomenda checar APIs em vez do user-agent para
  *recursos*, mas aqui o objetivo é adaptar a modalidade de entrada e o custo
  de renderização ao aparelho, então o token estável do UA é o sinal certo.
  "OculusBrowser" aparece nos modos desktop e mobile; "Quest 2" / "Quest 3" /
  "Quest Pro" só identificam o modelo e casariam com outros UAs com "Quest".

  `?quest=1` força o modo Quest no desktop (testes); `?quest=0` desliga.
*/
const QUEST_USER_AGENT = /\bOculusBrowser\//;

export function detectQuest({
  userAgent = globalThis.navigator?.userAgent ?? '',
  search = globalThis.location?.search ?? ''
} = {}){
  const forced = new URLSearchParams(search).get('quest');
  if(forced === '1') return true;
  if(forced === '0') return false;
  return QUEST_USER_AGENT.test(userAgent);
}

/*
  O Quest usa GPU mobile e o canvas Three.js fica atrás de um HUD DOM inteiro.
  Limitar o pixel ratio e usar sombra PCF simples mantém a taxa de quadros
  estável sem mexer no enquadramento nem nos assets.
*/
export function getRenderProfile(isQuest = globalThis.isQuestBrowser){
  return isQuest
    ? { maxPixelRatio: 1, softShadows: false }
    : { maxPixelRatio: 2, softShadows: true };
}

export function initQuestSupport(){
  const isQuest = detectQuest();
  globalThis.isQuestBrowser = isQuest;
  document.body.classList.toggle('quest-browser', isQuest);
  return isQuest;
}

globalThis.getRenderProfile = getRenderProfile;
