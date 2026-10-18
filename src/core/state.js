import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadPackedDance, retargetPackedClips } from '../dances/packed-clips.js';
import { SONGS, DEFAULT_SONG } from '../config/songs.js';
import { DIFFICULTIES, DEFAULT_DIFFICULTY } from '../config/difficulties.js';
import { STAGE_LOOKS } from '../config/stage-looks.js';
import * as GameplayConfig from '../config/gameplay.js';

Object.assign(globalThis, {
  THREE, FBXLoader, SkeletonUtils, loadPackedDance, retargetPackedClips,
  SONGS, DIFFICULTIES, STAGE_LOOKS, ...GameplayConfig
});

globalThis.selectedSong = 'ragatanga';

globalThis.songChosenByUser = false;

globalThis.menuSelectedMode = 1;

globalThis.danceFiles = {};

globalThis.danceClipCache = new WeakMap();

globalThis.danceLoading = new Set();

globalThis.danceErrors = new Set();

globalThis.musicError = false;

globalThis.lastAnimationAt = 0;

globalThis.beatmap = SONGS[selectedSong].beatmap;

globalThis.AUDIO_START = beatmap.audioStart;

globalThis.AUDIO_END = beatmap.audioEnd;

globalThis.GAME_DURATION = beatmap.duration;

globalThis.RECENT_MATCH_LIMIT = 10;

globalThis.LEADERBOARD_STORAGE_KEY = 'ragatanga.recent-matches.v1';

globalThis.missSoundTemplates =
  MISS_SOUND_URLS.map(
    url => {
      const sound = new Audio(url);
      sound.preload = 'metadata';
      sound.volume = .54;
      return sound;
    }
  );

globalThis.lastMissSoundIndex = -1;

globalThis.victorySound = new Audio(VICTORY_SOUND_URL);
victorySound.preload = 'auto';
victorySound.volume = .92;

globalThis.wastedSound = new Audio(WASTED_SOUND_URL);
wastedSound.preload = 'auto';
wastedSound.volume = .94;

globalThis.selectedDifficulty = 'easy';

globalThis.scene = undefined;

globalThis.camera = undefined;

globalThis.renderer = undefined;

globalThis.hemiLight = undefined;

globalThis.keyLight = undefined;

globalThis.fillLight = undefined;

globalThis.rimLight = undefined;

globalThis.frontLight = undefined;

globalThis.ambientLight = undefined;

globalThis.contactShadowTexture = undefined;

globalThis.contactShadowP1 = undefined;

globalThis.contactShadowP2 = undefined;

globalThis.baseModel = undefined;

globalThis.p1Loaded = false;

globalThis.characterError = false;

globalThis.thrillerModels = {
  p1: null,
  p2: null
};

globalThis.thrillerCharacterErrors = new Set();

/* Skins de SONG_CHARACTERS: { [songId]: { p1, p2 } } e erros "songId:p1". */
globalThis.songCharacterModels = {};

globalThis.songCharacterErrors = new Set();

globalThis.thrillerMichaelSource = null;

globalThis.thrillerMichaelPreparing = false;

globalThis.menuPreviewState = {
  active: false,
  startedAt: 0,
  lastAt: 0,
  previewingSong: null
};

globalThis.characterMotionCache = new WeakMap();

globalThis.defeatClip = null;

globalThis.defeatSource = null;

globalThis.defeatRawClip = null;

globalThis.defeatAnimationError = false;

globalThis.defeatSequence = null;

globalThis.victoryClip = null;

globalThis.victorySource = null;

globalThis.victoryRawClip = null;

globalThis.victoryAnimationError = false;

globalThis.menuIdleClip = null;

globalThis.menuIdleSource = null;

globalThis.menuIdleRawClip = null;

globalThis.menuIdleAnimationError = false;

globalThis.completionClips = {
  p1: null,
  p2: null
};

globalThis.completionSources = {
  p1: null,
  p2: null
};

globalThis.completionRawClips = {
  p1: null,
  p2: null
};

globalThis.completionAnimationErrors = new Set();

globalThis.completionSequence = null;

globalThis.resultCelebrationSequence = null;

globalThis.preMatchClips = {
  p1: null,
  p2: null
};

globalThis.preMatchSources = {
  p1: null,
  p2: null
};

globalThis.preMatchRawClips = {
  p1: null,
  p2: null
};

globalThis.preMatchAnimationErrors = new Set();

globalThis.preMatchLastAt = 0;

globalThis.mode = 1;

globalThis.running = false;

globalThis.preRolling = false;

globalThis.preRollStartedAt = 0;

globalThis.preRollDuration = 3;

globalThis.gamePaused = false;

globalThis.preRollElapsedAtPause = 0;

globalThis.ringP1 = undefined;

globalThis.ringP2 = undefined;

globalThis.dancers = {
  p1: null,
  p2: null
};

globalThis.players = {};

globalThis.stageBackgroundVideo =
  document.querySelector('#stageBackgroundVideo');

globalThis.music =
  document.querySelector('#music');

globalThis.menu =
  document.querySelector('#menuOverlay');

globalThis.hud =
  document.querySelector('#hud');

globalThis.resultOverlay =
  document.querySelector('#resultOverlay');

globalThis.countdown =
  document.querySelector('#countdown');

globalThis.completionOverlay =
  document.querySelector('#completionOverlay');

globalThis.pauseOverlay =
  document.querySelector('#pauseOverlay');

globalThis.wastedOverlay =
  document.querySelector('#wastedOverlay');

globalThis.wastedWord =
  document.querySelector('#wastedWord');

globalThis.wastedBar =
  document.querySelector('#wastedBar');

globalThis.pauseButton =
  document.querySelector('#pauseButton');

globalThis.continueGameButton =
  document.querySelector('#continueGame');

globalThis.pauseBackMenuButton =
  document.querySelector('#pauseBackMenu');

globalThis.leaderboardOverlay =
  document.querySelector('#leaderboardOverlay');

globalThis.startGameButton = document.querySelector('#startGameButton');

globalThis.menuPreviewTitle = document.querySelector('#menuPreviewTitle');

globalThis.menuPreviewSubtitle = document.querySelector('#menuPreviewSubtitle');

globalThis.retryFromResultsButton = document.querySelector('#retryFromResults');

globalThis.chooseMusicFromResultsButton = document.querySelector('#chooseMusicFromResults');

globalThis.leaderboardRows =
  document.querySelector('#leaderboardRows');

globalThis.leaderboardEmpty =
  document.querySelector('#leaderboardEmpty');

globalThis.leaderboardError =
  document.querySelector('#leaderboardError');

globalThis.resultStatus =
  document.querySelector('#resultStatus');

globalThis.defeatOverlay =
  document.querySelector('#defeatOverlay');

globalThis.defeatTitle =
  document.querySelector('#defeatTitle');

globalThis.defeatMessage =
  document.querySelector('#defeatMessage');

globalThis.defeatDetails =
  document.querySelector('#defeatDetails');

globalThis.defeatRetryButton =
  document.querySelector('#defeatRetry');

globalThis.defeatBackMenuButton =
  document.querySelector('#defeatBackMenu');

// Shared runtime state is intentionally centralized so domain modules remain independent.
