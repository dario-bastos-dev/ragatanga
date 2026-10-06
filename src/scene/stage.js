import * as THREE from 'three';

/*
  Palco 3D: cena, câmera, luzes, chão, círculos dos jogadores
  e o loop de renderização.
*/
export let scene;

let camera;
let renderer;

let ringP1;
let ringP2;

/*
  onFrame é chamado a cada quadro, antes de renderizar
  (atualização do jogo).
*/
export function initStage(
  onFrame
){

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

  renderer.setAnimationLoop(
    () => {

      onFrame();

      renderer.render(
        scene,
        camera
      );

    }
  );

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

/* Posição horizontal de cada personagem no palco. */
export function stagePositions(
  mode
){

  return {
    p1: mode === 2
      ? -72
      : 30,
    p2: 72
  };

}

export function layoutRings(
  mode
){

  ringP1.position.x =
    stagePositions(mode).p1;

  ringP2.visible =
    mode === 2;

}
