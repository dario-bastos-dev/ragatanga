export function formatTime(seconds){

  const minutes =
    Math.floor(seconds / 60);

  const rest =
    Math.floor(seconds % 60);

  return minutes + ':' +
    String(rest).padStart(2, '0');

}

export function positiveModulo(
  value,
  modulus
){

  return (
    (
      value %
      modulus
    ) +
    modulus
  ) %
  modulus;

}

export function seededRandom(
  seed
){

  let value =
    seed >>> 0;

  return () => {

    value =
      (
        value * 1664525 +
        1013904223
      ) >>> 0;

    return value /
      4294967296;

  };

}

export function wait(
  milliseconds
){

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );

}

/*
  Índice fracionário da batida no instante t (0 = primeira batida),
  interpolando entre as batidas do beatmap e extrapolando nas pontas.
*/
export function beatPosition(
  beats,
  t
){

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
