import * as THREE from 'three';

/*
  Coreografia procedural do Billie Jean
  -------------------------------------
  Não existe preset gratuito dessa dança, então o clip é gerado por código
  sobre o esqueleto Mixamo do Samba Dancing.fbx (mesmos nomes de ossos,
  sem retargeting).

  Loop de 16 batidas (116,7 BPM ≈ 8,2 s):
    1-4    moonwalk de perfil, deslizando para trás pelo palco
    5      giro
    6      toe stand (duas pontas de pé)
    7      hat tip (mão na aba do chapéu)
    8      apontar com o corpo inclinado para trás
    9-12   moonwalk de perfil para o outro lado, voltando
    13     giro no sentido contrário
    14     toe stand
    15     joelho levantado (em 3/4 para aparecer na câmera)
    16     chute lateral

  Cada pose é um conjunto de rotações em graus, aplicadas nos EIXOS DO
  CORPO (X = pitch, Y = giro, Z = roll) sobre a posição que o osso teria
  seguindo o pai. Com o corpo de frente (+Z):
    UpLeg  X+  → perna para trás      Leg      X+ → joelho dobra
    UpLeg  Z∓  → perna abre p/ o lado (negativo = direita abre)
    Arm    X-  → braço para frente    ForeArm  X- → cotovelo dobra
    Arm    Z∓  → braço esquerdo/direito sobe (negativo = esq. sobe)
    Spine  X+  → tronco para frente
  Pés e cabeça são "absolutos": 0 = pé reto no chão / cabeça reta,
  independente da perna.

  Parâmetros especiais:
    _turn   direção do corpo em graus (0 = de frente para a câmera)
    _hips   deslocamento do quadril [x, y, z] no mundo, em cm
            (a altura é corrigida automaticamente para o pé tocar o chão)
    _lhand  mão esquerda [dedos, indicador] em graus de flexão
    _rhand  mão direita  [dedos, indicador]

  Fluidez:
    - as poses (uma por batida) são ligadas por uma spline cardinal
      cíclica, então o corpo não para em cada batida;
    - tronco, cabeça, braços, antebraços e mãos seguem com pequenos
      atrasos em cascata (sobreposição de movimento);
    - por cima corre um groove contínuo: quique nos joelhos, balanço
      lateral do tronco e aceno de cabeça.
*/

export const BILLIE_JEAN_BPM = 116.7;
export const BILLIE_JEAN_LOOP_BEATS = 16;

const BEAT = 60 / BILLIE_JEAN_BPM;
const SAMPLES_PER_BEAT = 24;

/* Distância do deslize do moonwalk para cada lado do centro. */
const GLIDE = 26;

/* Ângulo do perfil no moonwalk (90 = perfil puro; menos = 3/4). */
const PROFILE = 80;

/* Flexão extra dos joelhos na batida (o quique vem das pernas). */
const GROOVE = 7;

/* Balanço lateral do tronco e aceno de cabeça, em graus. */
const SWAY = 3;
const NOD = 4;

/* 0 = Catmull-Rom; valores maiores reduzem o "passar do ponto". */
const TENSION = 0.25;

/*
  Atraso (em batidas) de cada parte em relação às pernas e ao quadril:
  quanto mais longe do centro do corpo, mais a parte "arrasta".
*/
const LAG = {
  Spine: 0.05,
  LeftArm: 0.06,
  RightArm: 0.06,
  Head: 0.1,
  LeftForeArm: 0.12,
  RightForeArm: 0.12,
  _lhand: 0.18,
  _rhand: 0.18
};

const ABSOLUTE = new Set([
  'LeftFoot',
  'RightFoot',
  'Head'
]);

const FINGER = /^(Left|Right)Hand(Index|Middle|Ring|Pinky)[1-3]$/;

/* Pontos do pé que podem tocar o chão. */
const CONTACTS = [
  'LeftToeBase',
  'RightToeBase',
  'LeftToe_End',
  'RightToe_End'
];

const BASE = {
  LeftArm: [0, 0, -78],
  RightArm: [0, 0, 78],
  LeftForeArm: [-15, 0, 0],
  RightForeArm: [-15, 0, 0],
  _turn: [0, 0, 0],
  _hips: [0, 0, 0],
  _lhand: [20, 15, 0],
  _rhand: [20, 15, 0]
};

function pose(overrides) {
  return { ...BASE, ...overrides };
}

/*
  Moonwalk: `planted` é a perna apoiada (pé reto, deslizando para trás);
  a outra fica à frente com o joelho dobrado e o calcanhar levantado.
  A cabeça vira para o público enquanto o corpo está de perfil.
*/
function moonwalk(planted, turn, x) {
  const p = planted;
  const t = planted === 'Left' ? 'Right' : 'Left';
  const s = planted === 'Left' ? 1 : -1;
  const facingRight = turn % 360 < 180;

  return pose({
    [p + 'UpLeg']: [10, 0, 0],
    [p + 'Leg']: [0, 0, 0],
    [p + 'Foot']: [0, 0, 0],

    [t + 'UpLeg']: [-22, 0, 0],
    [t + 'Leg']: [48, 0, 0],
    [t + 'Foot']: [62, 0, 0],

    Hips: [0, s * 6, 0],
    Spine: [8, -s * 4, 0],
    Head: [0, facingRight ? -40 : 40, 0],

    LeftArm: [-s * 18, 0, -80],
    RightArm: [s * 18, 0, 80],
    LeftForeArm: [-70, 0, 0],
    RightForeArm: [-70, 0, 0],

    _turn: [turn, 0, 0],
    _hips: [x, 0, 0],
    _lhand: [35, 25, 0],
    _rhand: [35, 25, 0]
  });
}

/* Final do giro: braços recolhidos junto ao peito, punhos fechados. */
function spinEnd(turn, x) {
  return pose({
    LeftArm: [-20, 0, -82],
    RightArm: [-20, 0, 82],
    LeftForeArm: [-115, 0, 0],
    RightForeArm: [-115, 0, 0],
    LeftLeg: [6, 0, 0],
    RightLeg: [6, 0, 0],
    _turn: [turn, 0, 0],
    _hips: [x, 0, 0],
    _lhand: [80, 80, 0],
    _rhand: [80, 80, 0]
  });
}

function toeStand(turn, x) {
  return pose({
    LeftUpLeg: [-4, 0, 0],
    RightUpLeg: [-4, 0, 0],
    LeftLeg: [4, 0, 0],
    RightLeg: [4, 0, 0],
    LeftFoot: [55, 0, 0],
    RightFoot: [55, 0, 0],
    Spine: [-4, 0, 0],
    Head: [-6, 0, 0],
    LeftArm: [0, 0, -84],
    RightArm: [-10, 0, 84],
    RightForeArm: [-40, 0, 0],
    _turn: [turn, 0, 0],
    _hips: [x, 0, 0],
    _lhand: [60, 60, 0],
    _rhand: [60, 60, 0]
  });
}

function hatTip(turn, x) {
  return pose({
    LeftLeg: [4, 0, 0],
    RightUpLeg: [-6, 0, -6],
    RightLeg: [10, 0, 0],
    Spine: [8, 0, 0],
    Head: [-10, 0, 12],
    RightArm: [-75, 0, 84],
    RightForeArm: [-105, 0, -20],
    LeftArm: [0, 0, -82],
    _turn: [turn, 0, 0],
    _hips: [x, 0, 0],
    _rhand: [50, 40, 0]
  });
}

function point(turn, x) {
  return pose({
    LeftUpLeg: [-25, 0, 0],
    LeftLeg: [10, 0, 0],
    RightUpLeg: [18, 0, -8],
    RightLeg: [6, 0, 0],
    Spine: [-10, 0, 0],
    Head: [0, -20, 0],
    RightArm: [0, 0, -40],
    RightForeArm: [0, 0, 0],
    LeftArm: [0, 0, -80],
    LeftForeArm: [-95, 0, 0],
    _turn: [turn, 0, 0],
    _hips: [x, 0, 0],
    _lhand: [75, 75, 0],
    _rhand: [85, 0, 0]
  });
}

function kneeLift(turn, x) {
  return pose({
    RightUpLeg: [-75, 0, 0],
    RightLeg: [85, 0, 0],
    RightFoot: [55, 0, 0],
    LeftLeg: [6, 0, 0],
    Spine: [-4, 0, 0],
    Head: [0, -turn, 0],
    RightArm: [-30, 0, 70],
    RightForeArm: [-60, 0, 0],
    LeftArm: [0, 0, -45],
    LeftForeArm: [-30, 0, 0],
    _turn: [turn, 0, 0],
    _hips: [x, 0, 0],
    _lhand: [70, 70, 0],
    _rhand: [70, 70, 0]
  });
}

function sideKick(turn, x) {
  return pose({
    RightUpLeg: [-30, 0, -35],
    RightLeg: [0, 0, 0],
    RightFoot: [40, 0, 0],
    LeftLeg: [8, 0, 0],
    Spine: [0, 0, 10],
    Head: [8, -15, 0],
    RightArm: [0, 0, 35],
    RightForeArm: [0, 0, 0],
    LeftArm: [0, 0, -20],
    LeftForeArm: [-40, 0, 0],
    _turn: [turn, 0, 0],
    _hips: [x, 0, 0],
    _lhand: [10, 5, 0],
    _rhand: [10, 5, 0]
  });
}

/*
  Primeira metade: perfil olhando para a direita (+X), desliza para -X.
  Segunda metade: perfil olhando para a esquerda, desliza de volta.
  Os giros continuam no mesmo valor de _turn para não "desenrolar".
  Uma pose por batida; depois da última o loop volta para a primeira.
*/
const KEYS = [
  [0, moonwalk('Left', PROFILE, GLIDE)],
  [1, moonwalk('Right', PROFILE, GLIDE / 3)],
  [2, moonwalk('Left', PROFILE, -GLIDE / 3)],
  [3, moonwalk('Right', PROFILE, -GLIDE)],
  [4, spinEnd(360, -GLIDE)],
  [5, toeStand(360, -GLIDE)],
  [6, hatTip(360, -GLIDE)],
  [7, point(360, -GLIDE)],
  [8, moonwalk('Left', 360 - PROFILE, -GLIDE)],
  [9, moonwalk('Right', 360 - PROFILE, -GLIDE / 3)],
  [10, moonwalk('Left', 360 - PROFILE, GLIDE / 3)],
  [11, moonwalk('Right', 360 - PROFILE, GLIDE)],
  [12, spinEnd(0, GLIDE)],
  [13, toeStand(0, GLIDE)],
  [14, kneeLift(35, GLIDE)],
  [15, sideKick(0, GLIDE)]
];

/* Hermite cúbica com tangentes cardinais. */
function cardinal(p0, p1, p2, p3, t) {
  const m1 = (1 - TENSION) * (p2 - p0) / 2;
  const m2 = (1 - TENSION) * (p3 - p1) / 2;
  const t2 = t * t;
  const t3 = t2 * t;

  return (2 * t3 - 3 * t2 + 1) * p1 +
    (t3 - 2 * t2 + t) * m1 +
    (-2 * t3 + 3 * t2) * p2 +
    (t3 - t2) * m2;
}

function splinePose(beat) {
  const n = KEYS.length;
  const wrapped = ((beat % n) + n) % n;
  const i = Math.floor(wrapped);
  const t = wrapped - i;

  const poses = [-1, 0, 1, 2].map(
    offset => KEYS[(i + offset + n) % n][1]
  );

  const out = {};

  for (const name of new Set(poses.flatMap(Object.keys))) {
    const [a, b, c, d] = poses.map(p => p[name] || [0, 0, 0]);

    out[name] = b.map((_, axis) =>
      cardinal(a[axis], b[axis], c[axis], d[axis], t)
    );
  }

  return out;
}

function addTo(current, name, delta) {
  const value = current[name] || [0, 0, 0];

  current[name] = value.map((v, i) => v + delta[i]);
}

function poseAt(beat) {
  const current = splinePose(beat);

  /* Sobreposição: cada parte usa a pose de um instante atrás. */
  const lagged = new Map();

  for (const [name, lag] of Object.entries(LAG)) {
    if (!lagged.has(lag)) {
      lagged.set(lag, splinePose(beat - lag));
    }

    current[name] = lagged.get(lag)[name] || [0, 0, 0];
  }

  /* Quique: joelhos dobram na batida e esticam no contratempo. */
  const groove = GROOVE * Math.pow(Math.cos(Math.PI * beat), 2);

  for (const side of ['Left', 'Right']) {
    addTo(current, side + 'UpLeg', [-groove, 0, 0]);
    addTo(current, side + 'Leg', [groove * 2, 0, 0]);
  }

  /* Tronco balança de um lado ao outro a cada 2 batidas. */
  addTo(current, 'Spine', [0, 0, SWAY * Math.sin(Math.PI * beat)]);

  /* Cabeça acena logo depois da batida. */
  addTo(current, 'Head', [
    NOD * Math.pow(Math.cos(Math.PI * (beat - LAG.Head)), 2),
    0,
    0
  ]);

  return current;
}

function boneKey(bone) {
  return bone.name.replace(/^mixamorig:?/, '');
}

/*
  O FBX do Mixamo traz cada osso em dobro: um nó com o nome do osso e,
  logo abaixo, outro com o mesmo nome. O three.js só anima o primeiro
  (PropertyBinding pega o primeiro nó com o nome), então o duplicado
  interno fica parado acompanhando o pai.
*/
function isDuplicate(bone) {
  return Boolean(
    bone.parent?.isBone &&
    bone.parent.name === bone.name
  );
}

const euler = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

function toQuaternion(degrees) {
  const [x, y, z] = degrees || [0, 0, 0];

  return new THREE.Quaternion().setFromEuler(
    euler.set(
      THREE.MathUtils.degToRad(x),
      THREE.MathUtils.degToRad(y),
      THREE.MathUtils.degToRad(z),
      'XYZ'
    )
  );
}

/*
  Flexão dos dedos no referencial de repouso (T-pose, palma para baixo):
  dedos da mão esquerda apontam para +X e fecham girando em -Z;
  os da direita apontam para -X e fecham em +Z.
*/
function fingerQuaternion(key, current) {
  const left = key.startsWith('Left');
  const [curl, indexCurl] = current[left ? '_lhand' : '_rhand'];
  const degrees = key.includes('Index') ? indexCurl : curl;

  return new THREE.Quaternion().setFromAxisAngle(
    AXIS_Z,
    THREE.MathUtils.degToRad(left ? -degrees : degrees)
  );
}

/*
  `model` é o modelo base já carregado (pose de repouso intacta).
  O modelo não é modificado: toda a cinemática usa só dados de repouso.
*/
export function createBillieJeanClip(model) {
  model.updateMatrixWorld(true);

  const bones = [];

  model.traverse(object => {
    if (object.isBone) {
      bones.push(object);
    }
  });

  const rest = new Map();

  for (const bone of bones) {
    rest.set(bone, {
      key: isDuplicate(bone) ? null : boneKey(bone),
      local: bone.quaternion.clone(),
      position: bone.position.clone(),
      world: bone.getWorldQuaternion(new THREE.Quaternion()),
      worldPosition: bone.getWorldPosition(new THREE.Vector3()),
      parentWorld: bone.parent
        ? bone.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion(),
      parentScale: bone.parent
        ? bone.parent.getWorldScale(new THREE.Vector3()).x
        : 1
    });
  }

  const hips = bones.find(bone => boneKey(bone) === 'Hips');

  if (!hips) {
    throw new Error('Esqueleto Mixamo sem osso Hips.');
  }

  const restHipsPosition = hips.position.clone();

  const hipsParentMatrix = hips.parent
    ? hips.parent.matrixWorld.clone()
    : new THREE.Matrix4();

  /* Converte deslocamentos em cm do mundo para o espaço do pai do Hips. */
  const worldToHipsParent = new THREE.Matrix3().setFromMatrix4(
    hipsParentMatrix.clone().invert()
  );

  const contacts = bones.filter(
    bone => CONTACTS.includes(rest.get(bone).key)
  );

  const animated = new Set([...ABSOLUTE, 'Hips']);

  for (const [, keyPose] of KEYS) {
    for (const name of Object.keys(keyPose)) {
      animated.add(name);
    }
  }

  const times = [];
  const rotations = new Map();
  const hipsValues = [];

  for (const bone of bones) {
    const key = rest.get(bone).key;

    if (key && (animated.has(key) || FINGER.test(key))) {
      rotations.set(bone, []);
    }
  }

  const steps = BILLIE_JEAN_LOOP_BEATS * SAMPLES_PER_BEAT;

  for (let step = 0; step <= steps; step++) {
    const beat = step / SAMPLES_PER_BEAT;
    const current = poseAt(beat);

    times.push(beat * BEAT);

    const turn = new THREE.Quaternion().setFromAxisAngle(
      UP,
      THREE.MathUtils.degToRad(current._turn[0])
    );

    const turnInverse = turn.clone().invert();

    const [x, y, z] = current._hips;

    const hipsLocal = restHipsPosition.clone().add(
      new THREE.Vector3(x, y, z).applyMatrix3(worldToHipsParent)
    );

    const world = new Map();
    const positions = new Map();

    for (const bone of bones) {
      const info = rest.get(bone);

      const parentIsPosed = bone.parent && world.has(bone.parent);

      const parentWorld = parentIsPosed
        ? world.get(bone.parent)
        : info.parentWorld;

      let newWorld;

      if (info.key === null) {
        newWorld = parentWorld.clone().multiply(info.local);
      } else if (FINGER.test(info.key)) {
        /* Dedos: flexão no referencial de repouso do pai. */
        const restParent = info.parentWorld;

        newWorld = parentWorld.clone().multiply(
          restParent.clone().invert()
            .multiply(fingerQuaternion(info.key, current))
            .multiply(restParent)
            .multiply(info.local)
        );
      } else {
        /* Rotação da pose nos eixos do corpo (já girado por _turn). */
        const delta = turn.clone()
          .multiply(toQuaternion(current[info.key]))
          .multiply(turnInverse);

        if (ABSOLUTE.has(info.key)) {
          newWorld = delta.multiply(turn).multiply(info.world);
        } else {
          const followParent = parentIsPosed
            ? parentWorld
            : turn.clone().multiply(parentWorld);

          newWorld = delta.multiply(
            followParent.clone().multiply(info.local)
          );
        }
      }

      world.set(bone, newWorld);

      positions.set(
        bone,
        parentIsPosed
          ? info.position.clone()
              .multiplyScalar(info.parentScale)
              .applyQuaternion(parentWorld)
              .add(positions.get(bone.parent))
          : (bone === hips ? hipsLocal : info.position).clone()
              .applyMatrix4(
                bone.parent ? bone.parent.matrixWorld : new THREE.Matrix4()
              )
      );

      if (rotations.has(bone)) {
        const local = parentWorld.clone().invert().multiply(newWorld);

        rotations.get(bone).push(local.x, local.y, local.z, local.w);
      }
    }

    /*
      Aterramento: o ponto do pé que ficou mais baixo em relação à sua
      altura de repouso volta exatamente para o chão.
    */
    const sink = Math.min(
      ...contacts.map(
        bone => positions.get(bone).y - rest.get(bone).worldPosition.y
      )
    );

    hipsLocal.add(
      new THREE.Vector3(0, -sink, 0).applyMatrix3(worldToHipsParent)
    );

    hipsValues.push(hipsLocal.x, hipsLocal.y, hipsLocal.z);
  }

  const tracks = [];

  for (const [bone, values] of rotations) {
    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        bone.name + '.quaternion',
        times,
        values
      )
    );
  }

  tracks.push(
    new THREE.VectorKeyframeTrack(
      hips.name + '.position',
      times,
      hipsValues
    )
  );

  return new THREE.AnimationClip(
    'BillieJean',
    BILLIE_JEAN_LOOP_BEATS * BEAT,
    tracks
  );
}
