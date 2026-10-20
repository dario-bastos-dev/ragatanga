// Um único grafo para a trilha ambiente. Nunca fecha/suspende sua rota audível.
let context;
let source;
let analyser;
let bins;
let preparing;
let media;
let average = .04;
let smoothed = 0;

export function resumeThemeAnalysis(){
  if(context && context.state !== 'running') return context.resume().catch(() => {});
  return Promise.resolve();
}

export function prepareThemeAnalysis(element){
  if(!element || preparing || source) return preparing || resumeThemeAnalysis();
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if(!Context) return Promise.resolve();
  preparing = (async () => {
    try{
      context ||= new Context();
      await context.resume();
      if(context.state !== 'running') return;
      source = context.createMediaElementSource(element);
      source.connect(context.destination);
      media = element;
      // Observação paralela, sem uma segunda conexão audível ao destination.
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = .65;
      source.connect(analyser);
      bins = new Float32Array(analyser.frequencyBinCount);
    }catch{
      // Se o analisador falhar, a conexão direta já criada permanece intacta.
      analyser = null;
    }finally{
      preparing = null;
    }
  })();
  return preparing;
}

export function sampleThemeBass(){
  if(!analyser || context.state !== 'running' || !media || media.paused || media.muted || media.volume === 0) return null;
  analyser.getFloatFrequencyData(bins);
  const hzPerBin = context.sampleRate / analyser.fftSize;
  let energy = 0;
  let count = 0;
  for(let i = Math.max(1, Math.ceil(40 / hzPerBin)); i <= Math.floor(190 / hzPerBin); i++){
    energy += Number.isFinite(bins[i]) ? Math.pow(10, bins[i] / 20) : 0;
    count++;
  }
  energy = energy / Math.max(1, count) / Math.max(.01, media.volume);
  average += (energy - average) * .035;
  const target = Math.max(0, Math.min(1, energy / Math.max(.025, average * 1.7)));
  smoothed += (target - smoothed) * (target > smoothed ? .65 : .2);
  return smoothed;
}

export function getThemeAnalysisState(){
  return { mode: analyser && context?.state === 'running' ? 'analyser' : 'fallback', state: context?.state || 'uninitialized', connected: Boolean(source) };
}
