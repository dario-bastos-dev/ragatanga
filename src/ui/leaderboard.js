import '../core/state.js';

function initLeaderboard(){

  document
    .querySelector('#openLeaderboard')
    .addEventListener(
      'click',
      openLeaderboard
    );

  const resultsLeaderboardButton = document.querySelector('#openLeaderboardFromResults');

  if(resultsLeaderboardButton){
    resultsLeaderboardButton.addEventListener(
      'click',
      openLeaderboard
    );
  }

  document
    .querySelector('#closeLeaderboard')
    .addEventListener(
      'click',
      () =>
        leaderboardOverlay.classList.add('hidden')
    );

}

function openLeaderboard(){

  renderLeaderboard();
  leaderboardOverlay.classList.remove('hidden');

}

function renderLeaderboard(){

  leaderboardRows.replaceChildren();
  leaderboardEmpty.classList.add('hidden');
  leaderboardError.classList.add('hidden');

  try{

    const performances =
      rankPerformances(
        loadRecentMatches()
      );

    if(performances.length === 0){
      leaderboardEmpty.classList.remove('hidden');
      return;
    }

    performances.forEach(
      (performance, index) =>
        leaderboardRows.appendChild(
          createLeaderboardRow(
            performance,
            index + 1
          )
        )
    );

  }catch(error){

    console.error(
      'Não foi possível carregar o ranking.',
      error
    );

    leaderboardError.textContent =
      'Não foi possível carregar o ranking salvo neste navegador.';

    leaderboardError.classList.remove('hidden');

  }

}

function createLeaderboardRow(
  performance,
  position
){

  const row =
    document.createElement('tr');

  const cells = [
    `${position}º`,
    performance.id,
    SONGS[performance.songId].title,
    DIFFICULTIES[performance.difficulty].label,
    performance.score.toLocaleString('pt-BR'),
    new Date(
      performance.playedAt
    ).toLocaleString(
      'pt-BR',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    )
  ];

  cells.forEach(
    (text, index) => {

      const cell =
        document.createElement(
          index === 0
            ? 'th'
            : 'td'
        );

      if(index === 0){
        cell.scope = 'row';
      }

      cell.textContent = text;
      row.appendChild(cell);

    }
  );

  return row;

}

Object.assign(globalThis, {
  initLeaderboard,
  openLeaderboard,
  renderLeaderboard,
  createLeaderboardRow
});
