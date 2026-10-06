import * as THREE from 'three';

import {
  FBXLoader
} from 'three/addons/loaders/FBXLoader.js';

import * as SkeletonUtils
  from 'three/addons/utils/SkeletonUtils.js';

import ragatangaBeatmap
  from './beatmaps/ragatanga.json';

import thrillerBeatmap
  from './beatmaps/thriller.json';

import ymcaBeatmap
  from './beatmaps/ymca.json';

import macarenaBeatmap
  from './beatmaps/macarena.json';

import {
  loadPackedDance,
  retargetPackedClips
} from './dances/packed-clips.js';

const P1_MODEL_URL =
  'https://threejs.org/examples/models/fbx/Samba%20Dancing.fbx';


const P1_KEYS = ['A','W','S','D'];

const P2_KEYS = [
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight'
];

const P2_LABELS = ['↑','←','↓','→'];

const LANE_X = [12.5,37.5,62.5,87.5];

/*
  Cada música traz seu beatmap, o arquivo de áudio e as sementes
  que definem a coreografia (sequência de notas) de cada jogador.
  A janela de áudio (audioStart/audioEnd) vem do próprio beatmap.

  dance (opcional): arquivo com os clips "dance" e "idle" da coreografia
  (gerado por scripts/build-dance.mjs). Sem ele, a música usa o clip
  Samba Dancing do FBX.

  danceBeats (opcional): o clip vira um loop de N batidas que segue as
  batidas do beatmap (acelera e desacelera junto com a música). Sem ele,
  o clip segue o relógio da partida.
*/
const SONGS = {
  ragatanga: {
    title: 'RAGATANGA',
    audio: './assets/audio/ragatanga.mp3',
    beatmap: ragatangaBeatmap,
    seedP1: 104729,
    seedP2: 130363
  },

  thriller: {
    title: 'THRILLER',
    audio: './assets/audio/thriller.mp3',
    beatmap: thrillerBeatmap,
    seedP1: 7919,
    seedP2: 15485863,
    dance: './assets/animations/thriller.json'
  },

  ymca: {
    title: 'YMCA',
    audio: './assets/audio/ymca.mp3',
    beatmap: ymcaBeatmap,
    seedP1: 27644437,
    seedP2: 49979687,
    dance: './assets/animations/ymca.json',
    danceBeats: 10
  },

  /* Os 16 tempos da Macarena = 16 batidas (4 compassos). */
  macarena: {
    title: 'MACARENA',
    audio: './assets/audio/macarena.mp3',
    beatmap: macarenaBeatmap,
    seedP1: 86028121,
    seedP2: 32452843,
    dance: './assets/animations/macarena.json',
    danceBeats: 16
  }
};

let selectedSong = 'ragatanga';

/*
  Coreografias: danceFiles[id] é o arquivo carregado;
  danceClips[id] = { dance, idle } já aplicados ao personagem.
*/
const danceFiles = {};
const danceClips = {};
const danceLoading = new Set();
const danceErrors = new Set();

let musicError = false;

/* Tempo de fade entre idle e coreografia ao errar/acertar. */
const DANCE_FADE = .25;

let lastAnimationAt = 0;

let beatmap = SONGS[selectedSong].beatmap;
let AUDIO_START = beatmap.audioStart;
let AUDIO_END = beatmap.audioEnd;
let GAME_DURATION = beatmap.duration;

const NORMAL_TARGET_Y = 82;
const SPAWN_Y = -12;

const MISS_PENALTY = 50;
const SPECIAL_SCORE = 150;

/*
  A velocidade abaixo controla o TEMPO DE VIAGEM.
  Menor tempo = nota cai mais rápido.

  EXTREMO usa 1,8 s: continua claramente mais rápido que o Difícil,
  mas permanece jogável para quem já tem prática.
*/
const DIFFICULTIES = {
  easy: {
    label: 'FÁCIL',
    beatStep: 4,
    travelTime: 3.5,
    description: '1 a cada 4 batidas · lento',
    special: false
  },

  normal: {
    label: 'NORMAL',
    beatStep: 2,
    travelTime: 2.8,
    description: '1 a cada 2 batidas · normal',
    special: false
  },

  hard: {
    label: 'DIFÍCIL',
    beatStep: 1,
    travelTime: 2.2,
    description: 'todas as batidas · rápido',
    special: false
  },

  extreme: {
    label: 'EXTREMO',
    beatStep: 1,
    travelTime: 1.8,
    description: 'todas as batidas + especial · rápido',
    special: true
  }
};

const HIT = {
  perfect: .070,
  great: .140,
  good: .220
};

let selectedDifficulty = 'normal';

let scene;
let camera;
let renderer;

let baseModel;
let p1Loaded = false;

let mode = 1;

let running = false;
let preRolling = false;
let preRollStartedAt = 0;
let preRollDuration = 3;

let ringP1;
let ringP2;

let dancers = {
  p1: null,
  p2: null
};

let players = {};

const music =
  document.querySelector('#music');

const menu =
  document.querySelector('#menuOverlay');

const hud =
  document.querySelector('#hud');

const resultOverlay =
  document.querySelector('#resultOverlay');

const countdown =
  document.querySelector('#countdown');

initSongMenu();
initDifficultyMenu();
init3D();

function formatTime(seconds){

  const minutes =
    Math.floor(seconds / 60);

  const rest =
    Math.floor(seconds % 60);

  return minutes + ':' +
    String(rest).padStart(2, '0');

}

function initSongMenu(){

  document
    .querySelectorAll('.songCard')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => selectSong(
            button.dataset.song
          )
        );

      }
    );

  music.addEventListener(
    'error',
    () => {

      musicError = true;

      document
        .querySelector('#onePlayer')
        .disabled = true;

      document
        .querySelector('#twoPlayers')
        .disabled = true;

      document
        .querySelector('#menuStatus')
        .textContent =
          'Áudio não encontrado: ' +
          SONGS[selectedSong].audio;

    }
  );

  music.addEventListener(
    'loadeddata',
    updateMenuAvailability
  );

  /* Garante o fim da partida se o áudio acabar antes da janela. */
  music.addEventListener(
    'ended',
    finish
  );

  selectSong(selectedSong);

}

function selectSong(id){

  const song =
    SONGS[id];

  if(!song){
    return;
  }

  selectedSong = id;

  beatmap = song.beatmap;
  AUDIO_START = beatmap.audioStart;
  AUDIO_END = beatmap.audioEnd;
  GAME_DURATION = beatmap.duration;

  document
    .querySelectorAll('.songCard')
    .forEach(
      item =>
        item.classList.toggle(
          'active',
          item.dataset.song === id
        )
    );

  document
    .querySelector('#progressStart')
    .textContent =
      formatTime(AUDIO_START);

  document
    .querySelector('#progressEnd')
    .textContent =
      formatTime(AUDIO_END);

  musicError = false;

  music.src =
    song.audio;

  music.load();

  loadSongDance(id);

  updateDifficultyInfo();
  updateMenuAvailability();

}

function loadSongDance(id){

  const song =
    SONGS[id];

  if(
    !song.dance ||
    danceFiles[id] ||
    danceLoading.has(id)
  ){
    return;
  }

  danceLoading.add(id);

  loadPackedDance(song.dance)
    .then(
      file => {
        danceFiles[id] = file;
      }
    )
    .catch(
      error => {

        console.error(
          'Erro na coreografia:',
          error
        );

        danceErrors.add(id);

      }
    )
    .finally(
      () => {

        danceLoading.delete(id);
        updateMenuAvailability();

      }
    );

}

function initDifficultyMenu(){

  document
    .querySelectorAll('.difficultyCard')
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            selectedDifficulty =
              button.dataset.difficulty;

            document
              .querySelectorAll('.difficultyCard')
              .forEach(
                item =>
                  item.classList.toggle(
                    'selected',
                    item === button
                  )
              );

            updateDifficultyInfo();

          }
        );

      }
    );

  updateDifficultyInfo();

}

function updateDifficultyInfo(){

  const config =
    DIFFICULTIES[selectedDifficulty];

  const noteCount =
    Math.ceil(
      beatmap.beats.length /
      config.beatStep
    );

  let extra = '';

  if(config.special){
    extra =
      ` + ~${Math.floor(beatmap.beats.length / 8)} hits X`;
  }

  document
    .querySelector('#difficultyInfo')
    .textContent =
      `${config.label} · ${noteCount} hits musicais${extra} · ${config.description}`;

}

function init3D(){

  scene =
    new THREE.Scene();

  scene.background =
    new THREE.Color(0x101419);

  scene.fog =
    new THREE.Fog(
      0x101419,
      480,
      1100
    );

  camera =
    new THREE.PerspectiveCamera(
      38,
      innerWidth / innerHeight,
      1,
      2000
    );

  camera.position.set(
    0,
    155,
    430
  );

  camera.lookAt(
    0,
    105,
    0
  );

  scene.add(
    new THREE.HemisphereLight(
      0xffffff,
      0x253020,
      4
    )
  );

  const keyLight =
    new THREE.DirectionalLight(
      0xffffff,
      5
    );

  keyLight.position.set(
    120,
    220,
    180
  );

  keyLight.castShadow = true;

  scene.add(keyLight);

  const floor =
    new THREE.Mesh(
      new THREE.CircleGeometry(
        330,
        64
      ),
      new THREE.MeshPhongMaterial({
        color: 0x20262b
      })
    );

  floor.rotation.x =
    -Math.PI / 2;

  floor.receiveShadow =
    true;

  scene.add(floor);

  ringP1 =
    createRing(
      30,
      0x1686ff
    );

  ringP2 =
    createRing(
      72,
      0xe83048
    );

  /*
    Importante:
    P2 vermelho não existe no chão
    enquanto o jogo estiver em 1 jogador.
  */
  ringP2.visible = false;

  renderer =
    new THREE.WebGLRenderer({
      antialias: true
    });

  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      2
    )
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  renderer.shadowMap.enabled =
    true;

  document
    .querySelector('#game')
    .appendChild(
      renderer.domElement
    );

  const loader =
    new FBXLoader();

  loader.load(
    P1_MODEL_URL,

    group => {

      baseModel = group;
      p1Loaded = true;

      updateMenuAvailability();

    },

    undefined,

    error => {

      console.error(
        'Erro P1:',
        error
      );

      document
        .querySelector('#menuStatus')
        .textContent =
          'Não foi possível carregar o P1.';

    }
  );


  addEventListener(
    'resize',
    () => {

      camera.aspect =
        innerWidth / innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        innerWidth,
        innerHeight
      );

    }
  );

  renderer.setAnimationLoop(render);

}

function createRing(
  x,
  color
){

  const ring =
    new THREE.Mesh(
      new THREE.RingGeometry(
        62,
        67,
        64
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: .35,
        side: THREE.DoubleSide
      })
    );

  ring.rotation.x =
    -Math.PI / 2;

  ring.position.set(
    x,
    .4,
    0
  );

  scene.add(ring);

  return ring;

}

function updateMenuAvailability(){

  const one =
    document.querySelector('#onePlayer');

  const two =
    document.querySelector('#twoPlayers');

  /*
    P1 e P2 agora usam exatamente o mesmo asset.
    Assim que o Samba Dancing carregar,
    os dois modos ficam disponíveis.
  */
  const danceReady =
    !SONGS[selectedSong].dance ||
    Boolean(danceFiles[selectedSong]);

  const ready =
    p1Loaded &&
    music.readyState >= 2 &&
    danceReady;

  one.disabled = !ready;
  two.disabled = !ready;

  if(ready){

    document
      .querySelector('#menuStatus')
      .textContent =
        `Pronto · ${beatmap.beatCount} batidas mapeadas · ${beatmap.detectedBpm.toFixed(1)} BPM`;

  }else{

    let status =
      'Carregando música…';

    if(danceErrors.has(selectedSong)){
      status = 'Não foi possível carregar a coreografia.';
    }else if(musicError){
      status = 'Áudio não encontrado: ' + SONGS[selectedSong].audio;
    }else if(!p1Loaded){
      status = 'Carregando personagem 3D…';
    }else if(!danceReady){
      status = 'Carregando coreografia…';
    }

    document
      .querySelector('#menuStatus')
      .textContent =
        status;

  }

}

function placeModel(
  object,
  x,
  targetHeight
){

  object.updateMatrixWorld(true);

  const box =
    new THREE.Box3()
      .setFromObject(
        object
      );

  const size =
    new THREE.Vector3();

  box.getSize(size);

  object.scale.setScalar(
    targetHeight /
    Math.max(
      size.y,
      .001
    )
  );

  object.updateMatrixWorld(true);

  const box2 =
    new THREE.Box3()
      .setFromObject(
        object
      );

  const center =
    new THREE.Vector3();

  box2.getCenter(center);

  object.position.x =
    x -
    center.x;

  object.position.z =
    -center.z;

  object.position.y =
    -box2.min.y;

  object.rotation.set(
    0,
    0,
    0
  );

  object.updateMatrixWorld(true);

}

function getDanceClips(){

  const file =
    danceFiles[selectedSong];

  if(!file){

    return {
      dance: baseModel.animations[0],
      idle: null
    };

  }

  danceClips[selectedSong] ??=
    retargetPackedClips(
      file,
      baseModel
    );

  return danceClips[selectedSong];

}

/*
  Cria o mixer do personagem com a coreografia da música.
  Com clip de idle, o personagem fica no idle enquanto o jogador erra
  e volta para a coreografia (com fade) quando acerta.
*/
function attachDance(
  object
){

  const {
    dance,
    idle
  } =
    getDanceClips();

  const mixer =
    new THREE.AnimationMixer(
      object
    );

  const action =
    mixer.clipAction(
      dance
    );

  action.play();

  let idleAction = null;

  if(idle){

    idleAction =
      mixer.clipAction(
        idle
      );

    idleAction.play();

    action.setEffectiveWeight(0);

  }

  mixer.setTime(0);

  return {
    type: 'native',
    object,
    mixer,
    clip: dance,
    action,
    idleAction,
    blend: 0,
    enabled: false
  };

}

function createP1(
  x
){

  const object =
    SkeletonUtils.clone(
      baseModel
    );

  object.traverse(
    child => {

      if(child.isMesh){

        child.castShadow = true;
        child.receiveShadow = true;

      }

    }
  );

  placeModel(
    object,
    x,
    175
  );

  scene.add(object);

  dancers.p1 =
    attachDance(object);

}

/*
  P2 = cópia exata do P1
  ----------------------
  Não existe mais retargeting.

  O P2 usa:
  - mesmo FBX
  - mesmo Skeleton
  - mesma coreografia
  - mesma escala
  - mesma postura

  A única diferença é visual:
  os materiais recebem uma coloração vermelha.
*/
function createP2(
  x
){

  const object =
    SkeletonUtils.clone(
      baseModel
    );

  const red =
    new THREE.Color(
      0xff314d
    );

  object.traverse(
    child => {

      if(!child.isMesh){
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;

      if(child.material){

        const originalMaterials =
          Array.isArray(child.material)
            ? child.material
            : [child.material];

        const clonedMaterials =
          originalMaterials.map(
            original => {

              const material =
                original.clone();

              /*
                Preserva textura, roughness, metalness,
                transparência etc. e altera somente
                a tonalidade visual.
              */
              if(material.color){

                material.color
                  .clone();

                material.color
                  .lerp(
                    red,
                    .72
                  );

              }

              if(
                material.emissive &&
                'emissiveIntensity' in material
              ){

                material.emissive
                  .set(
                    0x26030a
                  );

                material.emissiveIntensity =
                  .12;

              }

              return material;

            }
          );

        child.material =
          Array.isArray(child.material)
            ? clonedMaterials
            : clonedMaterials[0];

      }

    }
  );

  placeModel(
    object,
    x,
    175
  );

  scene.add(object);

  dancers.p2 =
    attachDance(object);

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

function resetSceneDancers(){

  for(
    const dancer
    of Object.values(dancers)
  ){

    if(dancer?.object){
      scene.remove(dancer.object);
    }

    if(dancer?.driver){
      scene.remove(dancer.driver);
    }

  }

  dancers = {
    p1: null,
    p2: null
  };

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

function buildDifficultyEvents(){

  const config =
    DIFFICULTIES[selectedDifficulty];

  const selectedBeats = [];

  for(
    let i = 0;
    i < beatmap.beats.length;
    i += config.beatStep
  ){

    selectedBeats.push({
      sourceBeatIndex: i,
      time: beatmap.beats[i]
    });

  }

  const randomP1 =
    seededRandom(SONGS[selectedSong].seedP1);

  const randomP2 =
    seededRandom(SONGS[selectedSong].seedP2);

  let previousP1 = -1;
  let previousP2 = -1;

  const regular =
    selectedBeats.map(
      beat => {

        let p1 =
          Math.floor(
            randomP1() * 4
          );

        if(
          p1 === previousP1 &&
          randomP1() > .25
        ){
          p1 = (p1 + 1) % 4;
        }

        let p2 =
          Math.floor(
            randomP2() * 4
          );

        /*
          No multiplayer, o P2 nunca recebe
          a mesma coluna equivalente do P1
          naquele mesmo instante.
        */
        if(p2 === p1){
          p2 = (p2 + 1 + (beat.sourceBeatIndex % 2)) % 4;
        }

        if(
          p2 === previousP2 &&
          randomP2() > .25
        ){
          p2 = (p2 + 1) % 4;

          if(p2 === p1){
            p2 = (p2 + 1) % 4;
          }
        }

        previousP1 = p1;
        previousP2 = p2;

        return {
          time: beat.time,
          p1,
          p2
        };

      }
    );

  const special = [];

  if(config.special){

    /*
      X entra no meio da batida, aproximadamente
      a cada 8 beats.

      Isso cria dificuldade extra sem transformar
      cada beat em um acorde impossível.
    */
    let specialCounter = 0;

    for(
      let i = 7;
      i < beatmap.beats.length - 1;
      i += 8
    ){

      const time =
        (
          beatmap.beats[i] +
          beatmap.beats[i + 1]
        ) /
        2;

      special.push({
        time,
        order: specialCounter++
      });

    }

  }

  return {
    regular,
    special
  };

}

function makePlayer(
  id,
  keys,
  notesLayerId,
  eventSet
){

  const layer =
    document.querySelector(
      '#' + notesLayerId
    );

  layer.innerHTML = '';

  const notes =
    eventSet.regular.map(
      (event,index) => {

        const lane =
          id === 'p1'
            ? event.p1
            : event.p2;

        const key =
          keys[lane];

        const element =
          document.createElement(
            'div'
          );

        element.className =
          'note';

        element.textContent =
          id === 'p1'
            ? P1_KEYS[lane]
            : P2_LABELS[lane];

        element.style.left =
          (
            selectedDifficulty === 'extreme'
              ? [10,30,50,70][lane]
              : LANE_X[lane]
          ) + '%';

        element.style.display =
          'none';

        layer.appendChild(element);

        return {
          index,
          type: 'regular',
          time: event.time,
          lane,
          key,
          resolved: false,
          element
        };

      }
    );

  const specials = [];

  if(
    DIFFICULTIES[selectedDifficulty]
      .special
  ){

    for(
      const event
      of eventSet.special
    ){

      /*
        No EXTREMO os dois jogadores recebem o especial
        nos mesmos tempos musicais, porém com teclas próprias:
        P1 = X
        P2 = Enter
      */
      const specialKey =
        id === 'p1'
          ? 'X'
          : 'Enter';

      const specialLabel =
        id === 'p1'
          ? 'X'
          : 'ENTER';

      const element =
        document.createElement(
          'div'
        );

      element.className =
        id === 'p1'
          ? 'specialNote'
          : 'specialNote enterSpecialNote';

      element.textContent =
        specialLabel;

      element.style.left =
        '90%';

      element.style.display =
        'none';

      layer.appendChild(element);

      specials.push({
        type: 'special',
        time: event.time,
        key: specialKey,
        resolved: false,
        element
      });

    }

  }

  return {
    id,
    keys,
    notes,
    specials,
    noteIndex: 0,
    specialIndex: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    results: {
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      special: 0
    }
  };

}

document
  .querySelector('#onePlayer')
  .onclick =
    () => startMode(1);

document
  .querySelector('#twoPlayers')
  .onclick =
    () => startMode(2);

document
  .querySelector('#backMenu')
  .onclick =
    () => location.reload();

async function startMode(
  selectedMode
){

  mode = selectedMode;

  resetSceneDancers();

  document.body
    .classList.toggle(
      'single',
      mode === 1
    );

  document.body
    .classList.toggle(
      'extreme',
      selectedDifficulty === 'extreme'
    );

  ringP1.position.x =
    mode === 2
      ? -72
      : 30;

  ringP2.visible =
    mode === 2;

  document
    .querySelector('#boardP2')
    .style.display =
      mode === 2
        ? 'block'
        : 'none';

  document
    .querySelector('#hudP2')
    .style.display =
      mode === 2
        ? 'block'
        : 'none';

  document
    .querySelector('#p2ProgressTag')
    .style.display =
      mode === 2
        ? 'inline-block'
        : 'none';

  document
    .querySelector('#difficultyHud')
    .textContent =
      DIFFICULTIES[
        selectedDifficulty
      ].label;

  const eventSet =
    buildDifficultyEvents();

  players.p1 =
    makePlayer(
      'p1',
      P1_KEYS,
      'notesP1',
      eventSet
    );

  players.p2 =
    mode === 2
      ? makePlayer(
          'p2',
          P2_KEYS,
          'notesP2',
          eventSet
        )
      : null;

  createP1(
    mode === 2
      ? -72
      : 30
  );

  if(mode === 2){
    createP2(72);
  }

  menu.style.display =
    'none';

  hud.style.display =
    'block';

  music.pause();

  music.currentTime =
    AUDIO_START;

  await startPreRoll();

  /*
    Audio é o relógio mestre.
  */
  await music.play();

  running = true;

}

async function startPreRoll(){

  const travelTime =
    DIFFICULTIES[
      selectedDifficulty
    ].travelTime;

  /*
    Mesmo no EXTREMO o jogador recebe
    alguns segundos para se preparar.
    A nota só aparece quando entra
    na janela de viagem correspondente.
  */
  preRollDuration =
    Math.max(
      3,
      travelTime
    );

  preRollStartedAt =
    performance.now();

  preRolling = true;

  countdown.style.display =
    'grid';

  while(true){

    const elapsed =
      (
        performance.now() -
        preRollStartedAt
      ) /
      1000;

    const remaining =
      Math.max(
        0,
        preRollDuration -
        elapsed
      );

    if(remaining <= 0){
      break;
    }

    const ratio =
      remaining /
      preRollDuration;

    countdown.textContent =
      ratio > .67
        ? '3'
        : ratio > .34
          ? '2'
          : '1';

    await wait(35);

  }

  countdown.textContent =
    'GO!';

  await wait(220);

  countdown.style.display =
    'none';

  preRolling = false;

}

addEventListener(
  'keydown',
  event => {

    if(
      !running ||
      event.repeat
    ){
      return;
    }

    const upper =
      event.key.toUpperCase();

    if(
      selectedDifficulty === 'extreme'
    ){

      if(
        upper === 'X'
      ){

        handleSpecialInput(
          players.p1,
          'X'
        );

        return;

      }

      if(
        mode === 2 &&
        event.key === 'Enter'
      ){

        event.preventDefault();

        handleSpecialInput(
          players.p2,
          'Enter'
        );

        return;

      }

    }

    if(
      P1_KEYS.includes(
        upper
      )
    ){

      handleInput(
        players.p1,
        upper
      );

    }

    if(
      mode === 2 &&
      P2_KEYS.includes(
        event.key
      )
    ){

      event.preventDefault();

      handleInput(
        players.p2,
        event.key
      );

    }

  }
);

function handleInput(
  player,
  key
){

  if(!player){
    return;
  }

  pulseReceptor(
    player.id,
    key,
    'pressed'
  );

  const t =
    gameTime();

  const candidate =
    findCandidate(
      player.notes,
      key,
      t
    );

  if(!candidate){

    registerInputMiss(
      player,
      'MISS'
    );

    return;

  }

  judgeCandidate(
    player,
    candidate,
    false
  );

}

function handleSpecialInput(
  player,
  key
){

  if(!player){
    return;
  }

  const t =
    gameTime();

  pulseSpecial(
    player.id,
    key,
    'pressed'
  );

  const candidate =
    findCandidate(
      player.specials,
      key,
      t
    );

  if(!candidate){

    registerInputMiss(
      player,
      key === 'Enter'
        ? 'MISS ENTER'
        : 'MISS X'
    );

    return;

  }

  judgeCandidate(
    player,
    candidate,
    true
  );

}

function findCandidate(
  collection,
  key,
  t
){

  let best = null;
  let bestDistance = Infinity;

  for(
    const note
    of collection
  ){

    if(
      note.resolved ||
      note.key !== key
    ){
      continue;
    }

    const distance =
      Math.abs(
        t -
        note.time
      );

    if(
      distance <
      bestDistance &&
      distance <= .72
    ){

      best =
        note;

      bestDistance =
        distance;

    }

  }

  return best;

}

function judgeCandidate(
  player,
  note,
  special
){

  const t =
    gameTime();

  const signed =
    t -
    note.time;

  const difference =
    Math.abs(signed);

  if(
    difference <=
    HIT.good
  ){

    if(special){

      resolveSpecialHit(
        player,
        note
      );

    }else if(
      difference <=
      HIT.perfect
    ){

      resolveHit(
        player,
        note,
        'PERFECT',
        100,
        'perfect'
      );

    }else if(
      difference <=
      HIT.great
    ){

      resolveHit(
        player,
        note,
        'GREAT',
        75,
        'great'
      );

    }else{

      resolveHit(
        player,
        note,
        'GOOD',
        50,
        'good'
      );

    }

    return;

  }

  registerInputMiss(
    player,
    special
      ? 'MISS X'
      : (
          signed < 0
            ? 'MISS • CEDO'
            : 'MISS • TARDE'
        )
  );

}

function setDancerEnabled(
  id,
  enabled
){

  const dancer =
    dancers[id];

  if(!dancer){
    return;
  }

  dancer.enabled =
    enabled;

}

function resolveHit(
  player,
  note,
  label,
  points,
  type
){

  note.resolved = true;

  player.score +=
    points;

  player.combo++;

  player.maxCombo =
    Math.max(
      player.maxCombo,
      player.combo
    );

  player.results[type]++;

  setDancerEnabled(
    player.id,
    true
  );

  pulseReceptor(
    player.id,
    note.key,
    'hit'
  );

  animateNote(
    note,
    'hit'
  );

  showJudgement(
    player.id,
    label + ' +' + points,
    false
  );

  moveIndices(player);
  updatePlayerHud(player);

}

function resolveSpecialHit(
  player,
  note
){

  note.resolved = true;

  player.score +=
    SPECIAL_SCORE;

  player.combo++;

  player.maxCombo =
    Math.max(
      player.maxCombo,
      player.combo
    );

  player.results.special++;

  setDancerEnabled(
    player.id,
    true
  );

  pulseSpecial(
    player.id,
    note.key,
    'hit'
  );

  animateNote(
    note,
    'hit'
  );

  showJudgement(
    player.id,
    'X SPECIAL +' +
      SPECIAL_SCORE,
    false
  );

  moveIndices(player);
  updatePlayerHud(player);

}

function registerInputMiss(
  player,
  label
){

  player.score =
    Math.max(
      0,
      player.score -
      MISS_PENALTY
    );

  player.combo = 0;
  player.results.miss++;

  setDancerEnabled(
    player.id,
    false
  );

  showJudgement(
    player.id,
    label + ' -' +
      MISS_PENALTY,
    true
  );

  triggerShake();
  updatePlayerHud(player);

}

function resolvePassedNote(
  player,
  note
){

  if(note.resolved){
    return;
  }

  note.resolved = true;

  player.score =
    Math.max(
      0,
      player.score -
      MISS_PENALTY
    );

  player.combo = 0;
  player.results.miss++;

  setDancerEnabled(
    player.id,
    false
  );

  animateNote(
    note,
    'missed'
  );

  showJudgement(
    player.id,
    note.type === 'special'
      ? 'MISS X -50'
      : 'MISS -50',
    true
  );

  triggerShake();

  moveIndices(player);
  updatePlayerHud(player);

}

function updatePlayerHud(
  player
){

  document
    .querySelector(
      '#score' +
      player.id.toUpperCase()
    )
    .textContent =
      String(
        player.score
      ).padStart(
        6,
        '0'
      );

  document
    .querySelector(
      '#combo' +
      player.id.toUpperCase()
    )
    .textContent =
      'COMBO x' +
      player.combo;

}

function pulseReceptor(
  id,
  key,
  className
){

  const element =
    document.querySelector(
      `.receptor[data-player="${id}"][data-key="${key}"]`
    );

  if(!element){
    return;
  }

  element.classList.remove(
    'pressed',
    'hit'
  );

  void element.offsetWidth;

  element.classList.add(
    className
  );

  setTimeout(
    () => {

      element.classList.remove(
        className
      );

    },
    className === 'hit'
      ? 155
      : 90
  );

}

function pulseSpecial(
  id,
  key,
  className
){

  const element =
    document.querySelector(
      `.specialReceptor[data-player="${id}"][data-key="${key}"]`
    );

  if(!element){
    return;
  }

  element.classList.remove(
    'pressed',
    'hit'
  );

  void element.offsetWidth;

  element.classList.add(
    className
  );

  setTimeout(
    () => {

      element.classList.remove(
        className
      );

    },
    className === 'hit'
      ? 175
      : 95
  );

}

function animateNote(
  note,
  className
){

  note.element
    .classList.add(
      className
    );

  setTimeout(
    () => {

      note.element.style.display =
        'none';

    },
    155
  );

}

function showJudgement(
  id,
  text,
  isMiss
){

  const element =
    document.querySelector(
      id === 'p1'
        ? '#judgeP1'
        : '#judgeP2'
    );

  element.textContent =
    text;

  element.style.opacity =
    '1';

  element.classList.toggle(
    'miss',
    isMiss
  );

  element.classList.remove(
    'pop'
  );

  void element.offsetWidth;

  element.classList.add(
    'pop'
  );

  clearTimeout(
    element._timer
  );

  element._timer =
    setTimeout(
      () => {

        element.style.opacity =
          '.12';

        element.classList.remove(
          'miss',
          'pop'
        );

      },
      420
    );

}

function triggerShake(){

  document.body
    .classList.remove(
      'screen-shake'
    );

  void document.body.offsetWidth;

  document.body
    .classList.add(
      'screen-shake'
    );

  setTimeout(
    () => {

      document.body
        .classList.remove(
          'screen-shake'
        );

    },
    230
  );

}

function moveIndices(
  player
){

  while(
    player.noteIndex <
      player.notes.length &&
    player.notes[
      player.noteIndex
    ].resolved
  ){
    player.noteIndex++;
  }

  while(
    player.specialIndex <
      player.specials.length &&
    player.specials[
      player.specialIndex
    ].resolved
  ){
    player.specialIndex++;
  }

}

function gameTime(){

  return (
    music.currentTime -
    AUDIO_START
  );

}

function currentPreviewTime(){

  if(!preRolling){
    return gameTime();
  }

  const elapsed =
    (
      performance.now() -
      preRollStartedAt
    ) /
    1000;

  return (
    -preRollDuration +
    elapsed
  );

}

function updateCollection(
  player,
  collection,
  t,
  travelTime,
  targetY,
  allowMisses
){

  for(
    const note
    of collection
  ){

    if(note.resolved){
      continue;
    }

    const secondsUntil =
      note.time -
      t;

    /*
      Ainda não entrou na pista.
    */
    if(
      secondsUntil >
      travelTime
    ){

      note.element.style.display =
        'none';

      continue;
    }

    /*
      Já passou bastante da zona.
    */
    if(
      secondsUntil <
      -.8
    ){

      note.element.style.display =
        'none';

      continue;
    }

    const progress =
      1 -
      (
        secondsUntil /
        travelTime
      );

    const y =
      SPAWN_Y +
      (
        targetY -
        SPAWN_Y
      ) *
      progress;

    note.element.style.display =
      'grid';

    note.element.style.top =
      y + '%';

    const near =
      Math.max(
        0,
        1 -
        Math.abs(
          secondsUntil
        ) /
        .44
      );

    note.element.style.transform =
      `translate(-50%,-50%) scale(${1 + near * .08})`;

    note.element.style.opacity =
      String(
        Math.max(
          .34,
          1 -
          Math.max(
            0,
            -secondsUntil
          ) *
          1.4
        )
      );

    if(
      allowMisses &&
      t >
        note.time +
        HIT.good &&
      !note.resolved
    ){

      resolvePassedNote(
        player,
        note
      );

    }

  }

}

function updatePlayerNotes(
  player,
  t,
  allowMisses
){

  if(!player){
    return;
  }

  const travelTime =
    DIFFICULTIES[
      selectedDifficulty
    ].travelTime;

  updateCollection(
    player,
    player.notes,
    t,
    travelTime,
    NORMAL_TARGET_Y,
    allowMisses
  );

  if(
    selectedDifficulty ===
    'extreme'
  ){

    updateCollection(
      player,
      player.specials,
      t,
      travelTime,
      NORMAL_TARGET_Y,
      allowMisses
    );

  }

  moveIndices(player);

}

function updateProgress(
  t
){

  const pct =
    Math.max(
      0,
      Math.min(
        100,
        (
          t /
          GAME_DURATION
        ) *
        100
      )
    );

  document
    .querySelector('#progressFill')
    .style.width =
      pct + '%';

  document
    .querySelector('#progressPct')
    .textContent =
      Math.round(pct) + '%';

}

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

/*
  Posição da animação no instante t da partida. Com danceBeats, o loop
  avança por batidas do beatmap em vez de segundos.
*/
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

/*
  Índice fracionário da batida no instante t (0 = primeira batida),
  interpolando entre as batidas do beatmap e extrapolando nas pontas.
*/
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

function updateGame(){

  if(preRolling){

    const preview =
      currentPreviewTime();

    updatePlayerNotes(
      players.p1,
      preview,
      false
    );

    if(mode === 2){

      updatePlayerNotes(
        players.p2,
        preview,
        false
      );

    }

    return;

  }

  if(!running){
    return;
  }

  const t =
    gameTime();

  updatePlayerNotes(
    players.p1,
    t,
    true
  );

  if(mode === 2){

    updatePlayerNotes(
      players.p2,
      t,
      true
    );

  }

  updateAnimation();

  updateProgress(t);

  if(
    music.currentTime >=
      AUDIO_END ||
    t >=
      GAME_DURATION
  ){

    music.pause();
    music.currentTime = AUDIO_END;

    finish();

  }

}

function finish(){

  if(!running){
    return;
  }

  running = false;

  music.pause();

  for(
    const dancer
    of Object.values(dancers)
  ){

    if(dancer){
      dancer.enabled = false;
    }

  }

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

  }

  if(mode === 2){

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

function render(){

  updateGame();

  renderer.render(
    scene,
    camera
  );

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
