const resultOverlay =
  document.querySelector('#resultOverlay');

/* Tela de fim de partida com o desempenho de cada jogador. */
export function showResults(
  players,
  mode,
  saveError = null
){

  document
    .querySelector('#resultStatus')
    .textContent =
      saveError || '';

  const grid =
    document.querySelector(
      '#resultGrid'
    );

  grid.innerHTML = '';

  grid.appendChild(
    resultPanel(
      players.p1,
      'P1',
      'blue'
    )
  );

  if(mode === 2){

    grid.appendChild(
      resultPanel(
        players.p2,
        'P2',
        'red'
      )
    );

    const p1Score =
      players.p1.score;

    const p2Score =
      players.p2.score;

    document
      .querySelector('#resultTitle')
      .textContent =
        p1Score === p2Score
          ? 'EMPATE!'
          : (
              p1Score > p2Score
                ? 'P1 VENCEU!'
                : 'P2 VENCEU!'
            );

  }else{

    document
      .querySelector('#resultTitle')
      .textContent =
        'RESULTADO';

  }

  resultOverlay
    .classList.remove(
      'hidden'
    );

}

function resultPanel(
  player,
  label,
  color
){

  const total =
    player.results.perfect +
    player.results.great +
    player.results.good +
    player.results.miss +
    player.results.special;

  const weighted =
    player.results.perfect +
    player.results.great * .75 +
    player.results.good * .5 +
    player.results.special;

  const accuracy =
    total
      ? (
          weighted /
          total *
          100
        )
      : 0;

  const div =
    document.createElement(
      'div'
    );

  div.className =
    'resultPanel ' +
    color;

  div.innerHTML =
    `
      <h3>
        ${label} ·
        ${player.score.toLocaleString('pt-BR')} pts
      </h3>

      <div>
        <span>Perfect</span>
        <b>${player.results.perfect}</b>
      </div>

      <div>
        <span>Great</span>
        <b>${player.results.great}</b>
      </div>

      <div>
        <span>Good</span>
        <b>${player.results.good}</b>
      </div>

      <div>
        <span>Special X</span>
        <b>${player.results.special}</b>
      </div>

      <div>
        <span>Miss</span>
        <b>${player.results.miss}</b>
      </div>

      <div>
        <span>Maior combo</span>
        <b>${player.maxCombo}</b>
      </div>

      <div>
        <span>Precisão</span>
        <b>${accuracy.toFixed(1)}%</b>
      </div>
    `;

  return div;

}
