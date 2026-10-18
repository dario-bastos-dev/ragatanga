/*
  You Dance v2.17 — ponto de entrada modular.
  A lógica fica dividida por domínio; este arquivo apenas conecta os módulos.
*/
import './core/state.js';
import './core/utils.js';
import './core/leaderboard.js';
import './ui/leaderboard.js';
import './audio/music.js';
import './scene/thriller-skin.js';
import './scene/song-skins.js';
import './scene/characters.js';
import './scene/dancers.js';
import './gameplay/chart.js';
import './ui/hud.js';
import './gameplay/judge.js';
import './ui/results.js';
import './gameplay/session.js';
import './gameplay/input.js';
import './ui/menu.js';
import './scene/stage.js';
import { initControls } from './ui/controls.js';

resultOverlay?.classList.add('hidden');

initSongMenu();
initDifficultyMenu();
initLeaderboard();
initControls();
initInput();
init3D();
initMenuThemeMusic();
