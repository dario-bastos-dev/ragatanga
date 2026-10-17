import './state.js';

function formatTime(seconds){

  const minutes =
    Math.floor(seconds / 60);

  const rest =
    Math.floor(seconds % 60);

  return minutes + ':' +
    String(rest).padStart(2, '0');

}

function positiveModulo(
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

function seededRandom(
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

function wait(
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


Object.assign(globalThis, {
  formatTime,
  positiveModulo,
  seededRandom,
  wait
});
