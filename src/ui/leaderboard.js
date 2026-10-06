import {
  SONGS
} from '../config/songs.js';

import {
  DIFFICULTIES
} from '../config/difficulties.js';

import {
  loadRecentMatches,
  rankPerformances
} from '../core/leaderboard.js';

const overlay =
  document.querySelector('#leaderboardOverlay');

const rows =
  document.querySelector('#leaderboardRows');

const emptyState =
  document.querySelector('#leaderboardEmpty');

const errorState =
  document.querySelector('#leaderboardError');

export function initLeaderboard(){

  document
    .querySelector('#openLeaderboard')
    .addEventListener(
      'click',
      openLeaderboard
    );

  document
    .querySelector('#openLeaderboardFromResults')
    .addEventListener(
      'click',
      openLeaderboard
    );

  document
    .querySelector('#closeLeaderboard')
    .addEventListener(
      'click',
      () =>
        overlay.classList.add('hidden')
    );

}

function openLeaderboard(){

  renderLeaderboard();
  overlay.classList.remove('hidden');

}

function renderLeaderboard(){

  rows.replaceChildren();
  emptyState.classList.add('hidden');
  errorState.classList.add('hidden');

  try{

    const performances =
      rankPerformances(
        loadRecentMatches()
      );

    if(performances.length === 0){
      emptyState.classList.remove('hidden');
      return;
    }

    performances.forEach(
      (performance, index) =>
        rows.appendChild(
          createRow(
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

    errorState.textContent =
      'Não foi possível carregar o ranking salvo neste navegador.';

    errorState.classList.remove('hidden');

  }

}

function createRow(
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
