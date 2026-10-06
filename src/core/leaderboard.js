import {
  SONGS
} from '../config/songs.js';

import {
  DIFFICULTIES
} from '../config/difficulties.js';

export const RECENT_MATCH_LIMIT = 10;

const STORAGE_KEY = 'ragatanga.recent-matches.v1';

export function loadRecentMatches(
  storage = globalThis.localStorage
){

  const serialized =
    storage.getItem(STORAGE_KEY);

  if(serialized === null){
    return [];
  }

  const matches =
    JSON.parse(serialized);

  if(
    !Array.isArray(matches) ||
    matches.some(
      match => !isValidMatch(match)
    )
  ){
    throw new Error(
      'O histórico de partidas salvo é inválido.'
    );
  }

  return matches;

}

export function recordMatch(
  match,
  storage = globalThis.localStorage
){

  const completedMatch = {
    ...match,
    playedAt: new Date().toISOString()
  };

  if(!isValidMatch(completedMatch)){
    throw new Error(
      'Não foi possível registrar uma partida inválida.'
    );
  }

  const recentMatches = [
    completedMatch,
    ...loadRecentMatches(storage)
  ].slice(
    0,
    RECENT_MATCH_LIMIT
  );

  storage.setItem(
    STORAGE_KEY,
    JSON.stringify(recentMatches)
  );

  return recentMatches;

}

export function rankPerformances(
  matches
){

  return matches
    .flatMap(
      match =>
        match.players.map(
          player => ({
            ...player,
            songId: match.songId,
            difficulty: match.difficulty,
            mode: match.mode,
            playedAt: match.playedAt
          })
        )
    )
    .sort(
      (first, second) =>
        second.score - first.score ||
        Date.parse(second.playedAt) -
          Date.parse(first.playedAt)
    )
    .slice(0, 10);

}

function isValidMatch(
  match
){

  if(
    !match ||
    typeof match !== 'object' ||
    !Object.hasOwn(SONGS, match.songId) ||
    !Object.hasOwn(DIFFICULTIES, match.difficulty) ||
    ![1, 2].includes(match.mode) ||
    !Number.isFinite(Date.parse(match.playedAt)) ||
    !Array.isArray(match.players) ||
    match.players.length !== match.mode
  ){
    return false;
  }

  const playerIds =
    match.players.map(
      player => player && player.id
    );

  return (
    playerIds.includes('P1') &&
    (
      match.mode === 1 ||
      playerIds.includes('P2')
    ) &&
    new Set(playerIds).size === playerIds.length &&
    match.players.every(
      player =>
        player &&
        ['P1', 'P2'].includes(player.id) &&
        Number.isSafeInteger(player.score) &&
        player.score >= 0
    )
  );

}
