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
import { initPointerInput } from './gameplay/pointer-input.js';
import { initGamepadInput } from './gameplay/gamepad-input.js';
import './ui/menu.js';
import './scene/stage.js';
import { initControls } from './ui/controls.js';
import { initIntro } from './ui/intro.js';
import { initMenuNavigation } from './ui/menu-navigation.js';
import { initQuestSupport } from './platform/quest.js';

initQuestSupport();
resultOverlay?.classList.add('hidden');
initIntro();
initMenuNavigation();

initSongMenu();
initDifficultyMenu();
initLeaderboard();
initControls();
initInput();
initPointerInput();
initGamepadInput();
init3D();
initMenuThemeMusic();
