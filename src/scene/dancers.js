import '../core/state.js';

function updateAnimation(){

  if(!running){
    return;
  }

  const now =
    performance.now();

  const delta =
    lastAnimationAt
      ? (now - lastAnimationAt) / 1000
      : 0;

  lastAnimationAt = now;

  const t =
    gameTime();

  animateDancer(
    dancers.p1,
    t,
    delta
  );

  if(mode === 2){

    animateDancer(
      dancers.p2,
      t,
      delta
    );

  }

}

function danceTime(
  t,
  duration
){

  const loopBeats =
    SONGS[selectedSong].danceBeats;

  if(!loopBeats){

    return positiveModulo(
      t,
      duration
    );

  }

  return positiveModulo(
    beatPosition(t),
    loopBeats
  ) /
  loopBeats *
  duration;

}

function beatPosition(
  t
){

  const beats =
    beatmap.beats;

  const last =
    beats.length - 1;

  if(t <= beats[0]){

    return (t - beats[0]) /
      (beats[1] - beats[0]);

  }

  if(t >= beats[last]){

    return last +
      (t - beats[last]) /
      (beats[last] - beats[last - 1]);

  }

  let low = 0;
  let high = last;

  while(high - low > 1){

    const middle =
      (low + high) >> 1;

    if(beats[middle] <= t){
      low = middle;
    }else{
      high = middle;
    }

  }

  return low +
    (t - beats[low]) /
    (beats[high] - beats[low]);

}

function animateDancer(
  dancer,
  t,
  delta
){

  if(!dancer){
    return;
  }

  const animationTime =
    danceTime(
      t,
      dancer.clip.duration
    );

  /*
    Sem idle: o personagem congela enquanto o jogador erra.
  */
  if(!dancer.idleAction){

    if(dancer.enabled){
      dancer.mixer.setTime(animationTime);
    }

    return;

  }

  dancer.blend =
    THREE.MathUtils.clamp(
      dancer.blend +
        (dancer.enabled ? delta : -delta) /
        DANCE_FADE,
      0,
      1
    );

  dancer.action.setEffectiveWeight(
    dancer.blend
  );

  dancer.idleAction.setEffectiveWeight(
    1 - dancer.blend
  );

  dancer.mixer.setTime(animationTime);

}


Object.assign(globalThis, {
  updateAnimation,
  danceTime,
  beatPosition,
  animateDancer
});
