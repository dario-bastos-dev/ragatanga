import { createIntroShow } from './intro-show.js';

// Estados da abertura são locais; não interfere com inputs da partida.
export function initIntro({ createShow = createIntroShow } = {}){
  const overlay = document.querySelector('#introOverlay');
  const button = document.querySelector('#introStart');
  const menu = document.querySelector('#menuOverlay');
  const logo = overlay?.querySelector('.introLogo');
  const destination = menu?.querySelector('.menuHeroLogo');
  if(!overlay || !button || !menu || !logo || !destination) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const show = createShow(overlay);
  let leaving = false;
  let finished = false;
  let fallback;
  let flight;
  let startedAt = 0;
  overlay.focus({ preventScroll: true });

  function finish(){
    if(finished) return;
    finished = true;
    clearTimeout(fallback);
    show.stop();
    flight?.cancel();
    overlay.hidden = true;
    document.body.classList.remove('intro-pending', 'intro-revealing');
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reduced.removeEventListener('change', onMotionChange);
    button.removeEventListener('click', begin);
    overlay.removeEventListener('pointerdown', activateAudio);
    menu.inert = false;
    menu.removeAttribute('aria-hidden');
    globalThis.enterInitialMenu?.();
    menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

  function makeFlight(){
    flight?.cancel();
    const from = logo.getBoundingClientRect();
    const to = destination.getBoundingClientRect();
    const target = `translate(${to.x - from.x}px,${to.y - from.y}px) scale(${to.width / from.width},${to.height / from.height})`;
    flight = logo.animate([
      { transform: 'none', offset: 0 },
      { transform: 'none', offset: 300 / 1400, easing: 'cubic-bezier(.45,0,.2,1)' },
      { transform: target, offset: 900 / 1400 },
      { transform: target, offset: 1 }
    ], { duration: 1400, fill: 'both' });
    flight.currentTime = Math.min(1400, performance.now() - startedAt);
    flight.onfinish = finish;
  }

  function activateAudio(){ show.activate(); }
  function begin(){
    if(leaving) return;
    leaving = true;
    startedAt = performance.now();
    activateAudio();
    globalThis.resumeMenuThemeMusic();
    show.impact();
    button.disabled = true;
    overlay.classList.add('introLeaving');
    document.body.classList.add('intro-revealing');
    if(reduced.matches){
      overlay.classList.add('introReduced');
      fallback = setTimeout(finish, 180);
    }else{
      try{ makeFlight(); }catch{ /* Falha de animação nunca bloqueia o menu. */ }
      fallback = setTimeout(finish, 1500);
    }
  }
  function onResize(){ if(leaving && !finished && !reduced.matches) makeFlight(); }
  function onVisibilityChange(){
    if(leaving && !document.hidden && performance.now() - startedAt >= 1400) finish();
  }
  function onMotionChange(){ if(leaving && reduced.matches) finish(); }
  function onKeyDown(event){
    event.stopImmediatePropagation();
    if(event.key === 'Tab'){
      event.preventDefault();
      button.focus({ preventScroll: true });
    }
    if(event.key === 'Enter'){
      event.preventDefault();
      if(!event.repeat && !event.isComposing) begin();
    }
  }
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibilityChange);
  reduced.addEventListener('change', onMotionChange);
  button.addEventListener('click', begin);
  overlay.addEventListener('pointerdown', activateAudio);
}
