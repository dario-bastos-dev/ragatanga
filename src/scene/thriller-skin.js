import '../core/state.js';

function hasMixamoRig(root){

  let found = false;

  root?.traverse(object => {
    if(
      object.isBone &&
      object.name === 'mixamorigHips'
    ){
      found = true;
    }
  });

  return found;

}

/*
  Articulações do Michael (v2.18)
  -------------------------------
  O MJ_THRILLER.fbx é uma malha estática em A-pose: braços ~40° abaixo da
  horizontal e pés mais afastados que o Samba. Os pontos abaixo foram medidos
  sobre o wireframe do próprio FBX, num espaço normalizado:

    x = lateral a partir do centro (+x = lado esquerdo do personagem)
    y = altura a partir da sola
    z = profundidade a partir do centro da bounding box (+z = frente)

  Unidade: altura total do Michael = 180. Só o lado esquerdo é descrito; o
  direito é espelhado em x.
*/
const MICHAEL_JOINTS = {
  Hips: [0, 99, -1],
  Spine: [0, 109, -2],
  Spine1: [0, 121, -3],
  Spine2: [0, 134, -3],
  Neck: [0, 150, -3],
  Head: [0, 160, -1],
  HeadTop_End: [0, 180, 1]
};

const MICHAEL_SIDE_JOINTS = {
  Shoulder: [6, 145, -3],
  Arm: [17.5, 142, -4],
  ForeArm: [40, 127, -4],
  Hand: [57, 114, 0],
  HandMiddle1: [64.5, 109, 2],
  HandMiddle4: [71, 104, 3],
  UpLeg: [9, 92, -1],
  Leg: [12, 50, 0],
  Foot: [14, 10, -4],
  ToeBase: [14, 2, 7],
  Toe_End: [14, 1, 14]
};

/*
  Ossos que giram da T-pose do Samba para a A-pose do Michael durante o bind.
  Cada item mira o osso filho na articulação medida acima.
*/
const MICHAEL_AIM_CHAIN = [
  ['Shoulder', 'Arm'],
  ['Arm', 'ForeArm'],
  ['ForeArm', 'Hand'],
  ['Hand', 'HandMiddle1'],
  ['UpLeg', 'Leg'],
  ['Leg', 'Foot'],
  ['Foot', 'ToeBase'],
  ['ToeBase', 'Toe_End']
];

/*
  Segmentos usados para os pesos de skin. Cada segmento pertence a um osso
  (owner) e vai da articulação desse osso até a próxima.
*/
const MICHAEL_WEIGHT_SEGMENTS = [
  ['Hips', 'Hips', 'Spine'],
  ['Hips', 'Hips', 'LeftUpLeg'],
  ['Hips', 'Hips', 'RightUpLeg'],
  ['Spine', 'Spine', 'Spine1'],
  ['Spine1', 'Spine1', 'Spine2'],
  ['Spine2', 'Spine2', 'Neck'],
  ['Spine2', 'Spine2', 'LeftShoulder'],
  ['Spine2', 'Spine2', 'RightShoulder'],
  ['Neck', 'Neck', 'Head'],
  ['Head', 'Head', 'HeadTop_End'],
  ...['Left', 'Right'].flatMap(side => [
    [`${side}Shoulder`, `${side}Shoulder`, `${side}Arm`],
    [`${side}Arm`, `${side}Arm`, `${side}ForeArm`],
    [`${side}ForeArm`, `${side}ForeArm`, `${side}Hand`],
    [`${side}Hand`, `${side}Hand`, `${side}HandMiddle4`],
    [`${side}UpLeg`, `${side}UpLeg`, `${side}Leg`],
    [`${side}Leg`, `${side}Leg`, `${side}Foot`],
    [`${side}Foot`, `${side}Foot`, `${side}ToeBase`],
    [`${side}ToeBase`, `${side}ToeBase`, `${side}Toe_End`]
  ])
];

/*
  Raio (na unidade 180) da transição suave de pesos em cada articulação,
  indexado pelo osso filho da articulação. Cotovelo/joelho largos o bastante
  para não "quebrar" a manga; punho/tornozelo curtos para não amassar mão/pé.
*/
const MICHAEL_JOINT_BLEND = {
  Spine: 6,
  Spine1: 6,
  Spine2: 6,
  Neck: 4,
  Head: 3.5,
  Shoulder: 4,
  Arm: 5.5,
  ForeArm: 5,
  Hand: 3,
  UpLeg: 7,
  Leg: 6,
  Foot: 3,
  ToeBase: 2
};

const MICHAEL_WEIGHT_PARENT = {
  Spine: 'Hips',
  Spine1: 'Spine',
  Spine2: 'Spine1',
  Neck: 'Spine2',
  Head: 'Neck',
  Shoulder: 'Spine2',
  Arm: 'Shoulder',
  ForeArm: 'Arm',
  Hand: 'ForeArm',
  UpLeg: 'Hips',
  Leg: 'UpLeg',
  Foot: 'Leg',
  ToeBase: 'Foot'
};

const stripSide = name =>
  name.replace(/^(Left|Right)/, '');

const sideOf = name =>
  name.match(/^(Left|Right)/)?.[1] || '';

function buildAutoRiggedThrillerSkin(
  staticSource,
  rigTemplate
){

  const rigRoot =
    SkeletonUtils.clone(rigTemplate);

  rigRoot.position.set(0, 0, 0);
  rigRoot.rotation.set(0, 0, 0);
  rigRoot.scale.set(1, 1, 1);
  rigRoot.updateMatrixWorld(true);

  const referenceMeshes = [];

  rigRoot.traverse(object => {
    if(
      object.isSkinnedMesh &&
      object.skeleton?.bones?.length
    ){
      referenceMeshes.push(object);
    }
  });

  if(!referenceMeshes.length){
    throw new Error(
      'O personagem base não possui uma malha skinned de referência.'
    );
  }

  /*
    O Samba Dancing.fbx traz ossos duplicados aninhados com o mesmo nome
    (ex.: LeftArm/LeftArm) e o skeleton das malhas de referência aponta ora
    para um, ora para outro. As animações (PropertyBinding) movem sempre o
    PRIMEIRO osso com aquele nome na hierarquia, então é esse conjunto que
    vira o esqueleto do Michael. Ossos de ponta (HeadTop_End, Toe_End...)
    também entram aqui, mesmo fora do skeleton original.
  */
  const boneByName =
    new Map();

  const allBones = [];

  rigRoot.traverse(object => {
    if(!object.isBone){
      return;
    }

    allBones.push(object);

    const name =
      object.name.replace(/^mixamorig/, '');

    if(!boneByName.has(name)){
      boneByName.set(name, object);
    }
  });

  const canonicalBones =
    [...boneByName.values()];

  const requiredBones = [
    'Hips',
    ...Object.keys(MICHAEL_JOINTS),
    ...['Left', 'Right'].flatMap(side =>
      Object.keys(MICHAEL_SIDE_JOINTS)
        .map(name => side + name)
    )
  ];

  for(const name of requiredBones){
    if(!boneByName.has(name)){
      throw new Error(
        `O rig base não possui mixamorig${name}.`
      );
    }
  }

  /*
    Encaixe da malha estática no espaço do rig: mesma altura do Samba, pés no
    chão e centralizada em x/z.
  */
  const rigBox =
    new THREE.Box3();

  for(const mesh of referenceMeshes){
    rigBox.union(
      new THREE.Box3().setFromObject(mesh)
    );
  }

  staticSource.updateMatrixWorld(true);

  const sourceBox =
    new THREE.Box3()
      .setFromObject(staticSource);

  const rigSize = rigBox.getSize(new THREE.Vector3());
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const rigCenter = rigBox.getCenter(new THREE.Vector3());
  const sourceCenter = sourceBox.getCenter(new THREE.Vector3());

  if(
    !Number.isFinite(sourceSize.y) ||
    sourceSize.y <= 0.0001 ||
    !Number.isFinite(rigSize.y) ||
    rigSize.y <= 0.0001
  ){
    throw new Error(
      'Não foi possível calcular as proporções da skin Michael.'
    );
  }

  const fitScale =
    rigSize.y / sourceSize.y;

  const fitMatrix =
    new THREE.Matrix4()
      .makeTranslation(
        rigCenter.x,
        rigBox.min.y,
        rigCenter.z
      )
      .multiply(
        new THREE.Matrix4()
          .makeScale(
            fitScale,
            fitScale,
            fitScale
          )
      )
      .multiply(
        new THREE.Matrix4()
          .makeTranslation(
            -sourceCenter.x,
            -sourceBox.min.y,
            -sourceCenter.z
          )
      );

  /* Unidade normalizada (altura 180) -> espaço do rig -> mundo. */
  const unit =
    rigSize.y / 180;

  const joints =
    new Map();

  const toWorld = ([x, y, z], mirror = 1) =>
    new THREE.Vector3(
      rigCenter.x + x * mirror * unit,
      rigBox.min.y + y * unit,
      rigCenter.z + z * unit
    ).applyMatrix4(rigRoot.matrixWorld);

  for(const [name, point] of Object.entries(MICHAEL_JOINTS)){
    joints.set(name, toWorld(point));
  }

  for(const [name, point] of Object.entries(MICHAEL_SIDE_JOINTS)){
    joints.set(`Left${name}`, toWorld(point, 1));
    joints.set(`Right${name}`, toWorld(point, -1));
  }

  /*
    Os lados Left/Right do Mixamo dependem da orientação do rig. Conferimos
    pelo Samba: se o LeftHand estiver em x negativo, espelhamos as medidas.
  */
  if(
    boneByName.get('LeftHand')
      .getWorldPosition(new THREE.Vector3())
      .x < rigCenter.x
  ){
    for(const name of Object.keys(MICHAEL_SIDE_JOINTS)){
      const left = joints.get(`Left${name}`);
      joints.set(`Left${name}`, joints.get(`Right${name}`));
      joints.set(`Right${name}`, left);
    }
  }

  const worldPosition = bone =>
    bone.getWorldPosition(new THREE.Vector3());

  const placeBoneAt = (
    bone,
    target
  ) => {
    bone.parent.updateMatrixWorld(true);
    bone.position.copy(
      bone.parent.worldToLocal(target.clone())
    );
    bone.updateMatrixWorld(true);
  };

  const scaleSubtree = (
    bone,
    factor
  ) => {
    for(const child of bone.children){
      if(!child.isBone){
        continue;
      }

      child.position.multiplyScalar(factor);
      scaleSubtree(child, factor);
    }
  };

  /*
    1) REST POSE = T-pose do Samba com as proporções do Michael
    -----------------------------------------------------------
    Os quaternions de repouso do Mixamo ficam intactos (é sobre eles que o
    retarget das coreografias trabalha). Só mudamos posições: o tronco vai
    para as articulações medidas e cada membro é alongado/encurtado para o
    comprimento real do Michael, mantendo a direção da T-pose.
  */
  for(const name of Object.keys(MICHAEL_JOINTS)){
    if(name === 'HeadTop_End'){
      continue;
    }

    placeBoneAt(
      boneByName.get(name),
      joints.get(name)
    );
  }

  for(const side of ['Left', 'Right']){

    placeBoneAt(
      boneByName.get(`${side}Shoulder`),
      joints.get(`${side}Shoulder`)
    );

    placeBoneAt(
      boneByName.get(`${side}UpLeg`),
      joints.get(`${side}UpLeg`)
    );

    for(const [fromName, toName] of MICHAEL_AIM_CHAIN){

      const child =
        boneByName.get(side + toName);

      const targetLength =
        joints.get(side + fromName)
          .distanceTo(
            joints.get(side + toName)
          );

      const restLength =
        child.position.length();

      if(restLength <= 1e-6){
        continue;
      }

      const factor =
        targetLength / restLength;

      child.position.multiplyScalar(factor);

      /* A mão inteira (dedos) acompanha a escala da palma. */
      if(toName === 'HandMiddle1'){
        const hand =
          boneByName.get(`${side}Hand`);

        for(const finger of hand.children){
          if(!finger.isBone){
            continue;
          }

          if(finger !== child){
            finger.position.multiplyScalar(factor);
          }

          scaleSubtree(finger, factor);
        }
      }

    }

  }

  const headTop =
    boneByName.get('HeadTop_End');

  headTop.position.setLength(
    joints.get('Head')
      .distanceTo(joints.get('HeadTop_End'))
  );

  rigRoot.updateMatrixWorld(true);

  const restQuaternions =
    new Map(
      allBones.map(bone => [
        bone,
        bone.quaternion.clone()
      ])
    );

  /*
    2) BIND POSE = A-pose do Michael
    --------------------------------
    Giramos temporariamente cada osso dos membros (swing mínimo) para que o
    esqueleto fique exatamente dentro da malha. É nessa pose que os pesos e
    as matrizes inversas de bind são calculados. Depois o esqueleto volta à
    T-pose e a malha acompanha. Resultado: as rotações das animações são
    aplicadas sobre a mesma rest pose para a qual foram retargetadas, e o
    braço não afunda mais no tronco.
  */
  const swing = new THREE.Quaternion();
  const boneWorldQuat = new THREE.Quaternion();
  const parentWorldQuat = new THREE.Quaternion();

  for(const side of ['Left', 'Right']){
    for(const [fromName, toName] of MICHAEL_AIM_CHAIN){

      const bone =
        boneByName.get(side + fromName);

      const child =
        boneByName.get(side + toName);

      const origin =
        worldPosition(bone);

      const current =
        worldPosition(child)
          .sub(origin)
          .normalize();

      const desired =
        joints.get(side + toName)
          .clone()
          .sub(origin)
          .normalize();

      swing.setFromUnitVectors(current, desired);

      bone.getWorldQuaternion(boneWorldQuat);
      bone.parent.getWorldQuaternion(parentWorldQuat);

      bone.quaternion
        .copy(parentWorldQuat.invert())
        .multiply(swing)
        .multiply(boneWorldQuat);

      bone.updateMatrixWorld(true);

    }
  }

  rigRoot.updateMatrixWorld(true);

  /*
    3) Pesos de skin por segmentos anatômicos
    -----------------------------------------
    Cada vértice pertence ao segmento de osso mais próximo. Perto de uma
    articulação ele é dividido suavemente entre os dois ossos que se
    encontram ali. No máximo dois ossos por vértice: nenhuma manga recebe
    peso do tronco ou do braço oposto.
  */
  const bonePoint = name =>
    worldPosition(boneByName.get(name));

  const boneIndex =
    new Map(
      canonicalBones.map((bone, index) => [
        bone,
        index
      ])
    );

  const indexOf = name =>
    boneIndex.get(boneByName.get(name));

  const segments =
    MICHAEL_WEIGHT_SEGMENTS.map(
      ([owner, fromName, toName]) => {

        const from = bonePoint(fromName);
        const to = bonePoint(toName);
        const side = sideOf(owner);
        const parentName =
          MICHAEL_WEIGHT_PARENT[stripSide(owner)];

        const endIsJoint =
          Boolean(MICHAEL_WEIGHT_PARENT[stripSide(toName)]);

        return {
          owner,
          ownerIndex: indexOf(owner),
          from,
          to,
          axis: to.clone().sub(from),
          length: from.distanceTo(to),
          parentIndex:
            parentName
              ? indexOf(
                  parentName === 'Hips' ||
                  !MICHAEL_SIDE_JOINTS[parentName]
                    ? parentName
                    : side + parentName
                )
              : null,
          startBlend:
            (MICHAEL_JOINT_BLEND[stripSide(owner)] || 0) * unit,
          childIndex:
            endIsJoint
              ? indexOf(toName)
              : null,
          endBlend:
            endIsJoint
              ? (MICHAEL_JOINT_BLEND[stripSide(toName)] || 0) * unit
              : 0
        };

      }
    );

  const offset = new THREE.Vector3();
  const closest = new THREE.Vector3();

  const measure = (
    point,
    segment
  ) => {

    offset.subVectors(point, segment.from);

    const t =
      THREE.MathUtils.clamp(
        offset.dot(segment.axis) /
          Math.max(segment.axis.lengthSq(), 1e-8),
        0,
        1
      );

    closest
      .copy(segment.from)
      .addScaledVector(segment.axis, t);

    return {
      t,
      distance: point.distanceTo(closest)
    };

  };

  const blendWeight = value =>
    THREE.MathUtils.smootherstep(value, 0, 1);

  const vertexWeights = point => {

    let best = null;
    let bestT = 0;
    let bestDistance = Infinity;

    for(const segment of segments){
      const { t, distance } =
        measure(point, segment);

      if(distance < bestDistance){
        best = segment;
        bestT = t;
        bestDistance = distance;
      }
    }

    const along =
      bestT * best.length;

    const remaining =
      (1 - bestT) * best.length;

    /* Início do segmento: transição com o osso pai. */
    if(
      best.parentIndex != null &&
      best.startBlend > 0 &&
      along < best.startBlend
    ){
      const own =
        blendWeight(
          0.5 + 0.5 * along / best.startBlend
        );

      return [
        [best.ownerIndex, own],
        [best.parentIndex, 1 - own]
      ];
    }

    /* Fim do segmento: transição com o osso filho. */
    if(
      best.childIndex != null &&
      best.endBlend > 0 &&
      remaining < best.endBlend
    ){
      const child =
        blendWeight(
          0.5 - 0.5 * remaining / best.endBlend
        );

      return [
        [best.ownerIndex, 1 - child],
        [best.childIndex, child]
      ];
    }

    return [
      [best.ownerIndex, 1]
    ];

  };

  /*
    Suavização de normais sem destruir UVs
    --------------------------------------
    O FBX do Michael vem com vértices duplicados por UV/material. Somamos as
    normais de tudo que ocupa a MESMA posição, preservando as UVs e evitando
    o aspecto facetado sob as luzes da fase.
  */
  const smoothNormalsAcrossPositionSeams = geometry => {

    const positions =
      geometry.getAttribute('position');

    if(!positions || positions.count < 3){
      return;
    }

    const tolerance =
      Math.max(
        rigSize.y * 0.000015,
        1e-6
      );

    const keyForVertex = vertex =>
      [
        Math.round(positions.getX(vertex) / tolerance),
        Math.round(positions.getY(vertex) / tolerance),
        Math.round(positions.getZ(vertex) / tolerance)
      ].join('|');

    const normalByPosition =
      new Map();

    const accumulate = (
      vertex,
      vector
    ) => {
      const key = keyForVertex(vertex);
      let sum = normalByPosition.get(key);

      if(!sum){
        sum = new THREE.Vector3();
        normalByPosition.set(key, sum);
      }

      sum.add(vector);
    };

    const importedNormals =
      geometry.getAttribute('normal');

    if(importedNormals){
      const imported = new THREE.Vector3();

      for(
        let vertex = 0;
        vertex < positions.count;
        vertex++
      ){
        accumulate(
          vertex,
          imported
            .fromBufferAttribute(importedNormals, vertex)
            .normalize()
        );
      }
    }else{
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      const faceNormal = new THREE.Vector3();
      const index = geometry.index;
      const count = index ? index.count : positions.count;

      for(let item = 0; item + 2 < count; item += 3){
        const ia = index ? index.getX(item) : item;
        const ib = index ? index.getX(item + 1) : item + 1;
        const ic = index ? index.getX(item + 2) : item + 2;

        a.fromBufferAttribute(positions, ia);
        b.fromBufferAttribute(positions, ib);
        c.fromBufferAttribute(positions, ic);

        faceNormal.crossVectors(
          b.sub(a),
          c.sub(a)
        );

        if(faceNormal.lengthSq() <= 1e-14){
          continue;
        }

        accumulate(ia, faceNormal);
        accumulate(ib, faceNormal);
        accumulate(ic, faceNormal);
      }
    }

    const normalArray =
      new Float32Array(positions.count * 3);

    const normal =
      new THREE.Vector3();

    for(
      let vertex = 0;
      vertex < positions.count;
      vertex++
    ){
      normal.copy(
        normalByPosition.get(keyForVertex(vertex)) ||
        new THREE.Vector3(0, 1, 0)
      );

      if(normal.lengthSq() > 1e-12){
        normal.normalize();
      }else{
        normal.set(0, 1, 0);
      }

      normal.toArray(normalArray, vertex * 3);
    }

    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(normalArray, 3)
    );
  };

  const prepareMichaelMaterial = sourceMaterial => {

    if(!sourceMaterial){
      return sourceMaterial;
    }

    const material =
      sourceMaterial.clone();

    /*
      O FBX original conecta a própria textura de cor ao TransparencyFactor.
      O FBXLoader interpreta isso como alphaMap e deixa o personagem
      translúcido. Preservamos a textura RGB e removemos a transparência.
    */
    material.transparent = false;
    material.opacity = 1;
    material.alphaMap = null;
    material.alphaTest = 0;
    material.depthWrite = true;
    material.depthTest = true;
    material.premultipliedAlpha = false;
    material.blending = THREE.NormalBlending;
    material.flatShading = false;
    material.vertexColors = false;

    if('shininess' in material){
      material.shininess = Math.min(
        material.shininess ?? 18,
        18
      );
    }

    if(material.specular?.setHex){
      material.specular.setHex(0x181818);
    }

    if('roughness' in material){
      material.roughness = Math.max(
        material.roughness ?? 0.72,
        0.72
      );
    }

    if('metalness' in material){
      material.metalness = Math.min(
        material.metalness ?? 0,
        0.04
      );
    }

    if('transmission' in material){
      material.transmission = 0;
    }

    if(material.color){
      material.color.set(0xffffff);
    }

    if(material.map){
      material.map.colorSpace =
        THREE.SRGBColorSpace;
      material.map.needsUpdate = true;
    }

    material.userData = {
      ...material.userData,
      michaelThrillerMaterial: true
    };

    material.needsUpdate = true;

    return material;

  };

  const michaelCenterX = rigCenter.x;
  const michaelBottomY = rigBox.min.y;
  const michaelHeight = rigSize.y;
  const michaelHalfSpan = sourceSize.x * fitScale * 0.5;

  /*
    Manga até o punho
    -----------------
    No FBX a manga vermelha termina no cotovelo e o antebraço usa uma peça
    de pele do atlas (bem mais fina que a manga). Para a jaqueta do Thriller,
    os vértices do antebraço passam a amostrar a segunda peça de manga do
    atlas e são engrossados em torno do próprio eixo até a largura da manga.
    UVs em fração do atlas 512x256; v cresce para cima.
  */
  const FOREARM_SKIN_UV = {
    uMin: 188 / 512,
    uMax: 254 / 512,
    vElbow: 1 - 148 / 256,
    vWrist: 1 - 230 / 256
  };

  const SLEEVE_UV = {
    uMin: 196 / 512,
    uMax: 250 / 512,
    vElbow: 1 - 64 / 256,
    vWrist: 1 - 104 / 256
  };

  const SLEEVE_THICKNESS = 1.35;

  const extendMichaelSleeves = geometry => {

    const positions = geometry.getAttribute('position');
    const uvs = geometry.getAttribute('uv');

    if(!positions || !uvs){
      return;
    }

    const sides = new Map();
    const point = new THREE.Vector3();

    for(let vertex = 0; vertex < positions.count; vertex++){

      const u = uvs.getX(vertex);
      const v = uvs.getY(vertex);

      if(
        u < FOREARM_SKIN_UV.uMin ||
        u > FOREARM_SKIN_UV.uMax ||
        v > FOREARM_SKIN_UV.vElbow ||
        v < FOREARM_SKIN_UV.vWrist
      ){
        continue;
      }

      point.fromBufferAttribute(positions, vertex);

      const outward =
        Math.abs(point.x - michaelCenterX) /
        michaelHalfSpan;

      const height =
        (point.y - michaelBottomY) /
        michaelHeight;

      /* Só os braços usam essa peça; a faixa evita tocar pernas/tornozelos. */
      if(outward < 0.35 || height < 0.52 || height > 0.82){
        continue;
      }

      const side = point.x > michaelCenterX ? 'positive' : 'negative';

      if(!sides.has(side)){
        sides.set(side, []);
      }

      sides.get(side).push(vertex);

    }

    const axisStart = new THREE.Vector3();
    const axisEnd = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const offset = new THREE.Vector3();

    for(const [side, vertices] of sides){

      /* Lado do mundo -> cadeia medida do braço daquele lado. */
      const prefix =
        ['Left', 'Right'].find(name =>
          (joints.get(`${name}Hand`).x > michaelCenterX) ===
          (side === 'positive')
        );

      if(!prefix || vertices.length < 6){
        continue;
      }

      const elbow = joints.get(`${prefix}ForeArm`);
      const wrist = joints.get(`${prefix}Hand`);

      const direction =
        wrist.clone().sub(elbow).normalize();

      const projected =
        vertices
          .map(vertex => ({
            vertex,
            along:
              point
                .fromBufferAttribute(positions, vertex)
                .sub(elbow)
                .dot(direction)
          }))
          .sort((a, b) => a.along - b.along);

      const middle = Math.floor(projected.length / 2);

      /* Eixo real do antebraço: centroides da metade do cotovelo e do punho. */
      const centroid = (items, target) => {
        target.set(0, 0, 0);
        for(const { vertex } of items){
          target.add(point.fromBufferAttribute(positions, vertex));
        }
        return target.divideScalar(items.length);
      };

      centroid(projected.slice(0, middle), axisStart);
      centroid(projected.slice(middle), axisEnd);
      axis.subVectors(axisEnd, axisStart).normalize();

      for(const { vertex } of projected){

        point.fromBufferAttribute(positions, vertex);
        offset.subVectors(point, axisStart);

        const along = offset.dot(axis);
        offset.addScaledVector(axis, -along);

        point
          .copy(axisStart)
          .addScaledVector(axis, along)
          .addScaledVector(offset, SLEEVE_THICKNESS);

        positions.setXYZ(vertex, point.x, point.y, point.z);

        const u =
          (uvs.getX(vertex) - FOREARM_SKIN_UV.uMin) /
          (FOREARM_SKIN_UV.uMax - FOREARM_SKIN_UV.uMin);

        const v =
          (uvs.getY(vertex) - FOREARM_SKIN_UV.vElbow) /
          (FOREARM_SKIN_UV.vWrist - FOREARM_SKIN_UV.vElbow);

        uvs.setXY(
          vertex,
          THREE.MathUtils.lerp(SLEEVE_UV.uMin, SLEEVE_UV.uMax, u),
          THREE.MathUtils.lerp(SLEEVE_UV.vElbow, SLEEVE_UV.vWrist, v)
        );

      }

    }

    positions.needsUpdate = true;
    uvs.needsUpdate = true;

  };

  /*
    A ombreira do FBX é um bloco plano que termina num degrau sobre o braço.
    Em A-pose o degrau some na linha do braço; com o braço abaixado vira uma
    ponta. Arredondamos o bloco: o excesso acima do topo do braço diminui em
    direção à ponta do ombro.
  */
  const SHOULDER_PAD = {
    base: 0.775,
    inner: 0.075,
    outer: 0.125,
    limit: 0.145,
    flatten: 0.6
  };

  const softenShoulderPads = geometry => {

    const positions = geometry.getAttribute('position');

    if(!positions){
      return;
    }

    const point = new THREE.Vector3();
    const baseY = michaelBottomY + michaelHeight * SHOULDER_PAD.base;

    for(let vertex = 0; vertex < positions.count; vertex++){

      point.fromBufferAttribute(positions, vertex);

      const outward =
        Math.abs(point.x - michaelCenterX) /
        michaelHeight;

      if(
        point.y <= baseY ||
        outward < SHOULDER_PAD.inner - 0.01 ||
        outward > SHOULDER_PAD.limit
      ){
        continue;
      }

      const flatten =
        SHOULDER_PAD.flatten *
        THREE.MathUtils.smoothstep(
          outward,
          SHOULDER_PAD.inner,
          SHOULDER_PAD.outer
        );

      positions.setY(
        vertex,
        baseY + (point.y - baseY) * (1 - flatten)
      );

    }

    positions.needsUpdate = true;

  };

  const michaelMeshes = [];

  staticSource.traverse(object => {
    if(
      object.isMesh &&
      object.geometry?.getAttribute('position')
    ){
      michaelMeshes.push(object);
    }
  });

  if(!michaelMeshes.length){
    throw new Error(
      'O FBX do Michael não possui malha.'
    );
  }

  const newMeshes = [];
  const point = new THREE.Vector3();

  for(const sourceMesh of michaelMeshes){

    const geometry =
      sourceMesh.geometry.clone();

    geometry.applyMatrix4(sourceMesh.matrixWorld);
    geometry.applyMatrix4(fitMatrix);

    extendMichaelSleeves(geometry);
    softenShoulderPads(geometry);

    smoothNormalsAcrossPositionSeams(geometry);

    const positions =
      geometry.getAttribute('position');

    const indicesArray =
      new Uint16Array(positions.count * 4);

    const weightsArray =
      new Float32Array(positions.count * 4);

    for(
      let vertex = 0;
      vertex < positions.count;
      vertex++
    ){

      point
        .fromBufferAttribute(positions, vertex)
        .applyMatrix4(rigRoot.matrixWorld);

      vertexWeights(point).forEach(
        ([index, weight], slot) => {
          indicesArray[vertex * 4 + slot] = index;
          weightsArray[vertex * 4 + slot] = weight;
        }
      );

    }

    geometry.setAttribute(
      'skinIndex',
      new THREE.Uint16BufferAttribute(indicesArray, 4)
    );

    geometry.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute(weightsArray, 4)
    );

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const material =
      Array.isArray(sourceMesh.material)
        ? sourceMesh.material.map(prepareMichaelMaterial)
        : prepareMichaelMaterial(sourceMesh.material);

    const skin =
      new THREE.SkinnedMesh(
        geometry,
        material
      );

    skin.name =
      `MichaelThriller_${sourceMesh.name || 'Mesh'}`;

    skin.castShadow = true;
    skin.receiveShadow = true;
    skin.frustumCulled = false;

    rigRoot.add(skin);
    newMeshes.push(skin);

  }

  rigRoot.updateMatrixWorld(true);

  /* Inversas de bind calculadas com o esqueleto ainda na A-pose. */
  const michaelSkeleton =
    new THREE.Skeleton(canonicalBones);

  michaelSkeleton.calculateInverses();

  for(const mesh of newMeshes){
    mesh.bind(
      michaelSkeleton,
      mesh.matrixWorld.clone()
    );
    mesh.normalizeSkinWeights();
  }

  /* Volta para a T-pose de repouso que o retarget espera. */
  for(const [bone, quaternion] of restQuaternions){
    bone.quaternion.copy(quaternion);
  }

  /* O corpo Samba vira apenas o rig invisível por baixo da skin. */
  for(const mesh of referenceMeshes){
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.thrillerRigReference = true;
  }

  rigRoot.userData.thrillerAutoRig = true;
  rigRoot.userData.thrillerSkin = 'Michael Jackson';
  rigRoot.updateMatrixWorld(true);

  return rigRoot;

}

function tryPrepareThrillerMichael(){

  if(
    thrillerMichaelPreparing ||
    thrillerModels.p1 ||
    !thrillerMichaelSource ||
    !baseModel
  ){
    return;
  }

  thrillerMichaelPreparing = true;

  try{

    /*
      Se algum arquivo futuro já vier com rig Mixamo, usamos diretamente.
      O FBX atual não possui rig, então cai no auto-rig acima.
    */
    thrillerModels.p1 =
      hasMixamoRig(thrillerMichaelSource)
        ? thrillerMichaelSource
        : buildAutoRiggedThrillerSkin(
            thrillerMichaelSource,
            baseModel
          );

    thrillerCharacterErrors.delete('p1');

    console.info(
      'Skin Michael Jackson preparada para Thriller.',
      thrillerModels.p1.userData?.thrillerAutoRig
        ? '(auto-rig Mixamo aplicado)'
        : '(rig Mixamo nativo)'
    );

  }catch(error){

    /*
      Nunca deixa a fase inteira indisponível por causa de uma skin.
      Em caso extremo, mantém o P1 padrão e a partida continua jogável.
    */
    console.error(
      'Falha ao preparar Michael Jackson para Thriller. Usando P1 padrão:',
      error
    );

    thrillerModels.p1 = baseModel;
    thrillerCharacterErrors.delete('p1');

  }finally{
    thrillerMichaelPreparing = false;
    updateMenuAvailability();
  }

  updateStartButtonState();

}


Object.assign(globalThis, {
  hasMixamoRig,
  buildAutoRiggedThrillerSkin,
  tryPrepareThrillerMichael
});
