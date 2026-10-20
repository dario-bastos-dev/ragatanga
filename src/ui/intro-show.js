import { prepareThemeAnalysis, sampleThemeBass, getThemeAnalysisState } from '../audio/intro-reactivity.js';

export function coverTransform(width, height, imageWidth = 1672, imageHeight = 941){
  const scale = Math.max(width / imageWidth, height / imageHeight);
  return { scale, x: (width - imageWidth * scale) / 2, y: (height - imageHeight * scale) / 2 };
}

export function createIntroShow(overlay){
  const media = globalThis.getMenuThemeAudio?.();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame;
  let lastFrame = 0;
  let hitAt = -Infinity;
  let stopped = false;
  function align(){
    const { scale, x, y } = coverTransform(innerWidth, innerHeight);
    overlay.style.setProperty('--scene-scale', scale);
    overlay.style.setProperty('--scene-x', `${x}px`);
    overlay.style.setProperty('--scene-y', `${y}px`);
  }
  function tick(time){
    if(stopped) return;
    frame = requestAnimationFrame(tick);
    if(document.hidden || time - lastFrame < 33) return;
    lastFrame = time;
    const playing = media && !media.paused && !media.muted && media.volume > 0;
    const actual = playing ? sampleThemeBass() : null;
    // Alternativa aproximada de 124 BPM, referenciada ao relógio da trilha.
    const fallback = playing ? Math.pow(Math.max(0, Math.cos(media.currentTime * 2 * Math.PI * 124 / 60)), 8) * .55 : 0;
    const bass = reduced.matches ? 0 : (actual ?? fallback);
    const hit = reduced.matches ? 0 : Math.max(0, 1 - (time - hitAt) / 300);
    overlay.style.setProperty('--bass', bass.toFixed(3));
    overlay.style.setProperty('--hit', hit.toFixed(3));
    overlay.dataset.audioMode = playing ? getThemeAnalysisState().mode : 'idle';
  }
  align();
  window.addEventListener('resize', align);
  frame = requestAnimationFrame(tick);
  return {
    align,
    activate(){ return prepareThemeAnalysis(media); },
    impact(){ hitAt = performance.now(); },
    stop(){ stopped = true; cancelAnimationFrame(frame); window.removeEventListener('resize', align); }
  };
}
