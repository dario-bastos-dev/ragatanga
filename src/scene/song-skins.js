import '../core/state.js';

/*
  Skins por música (SONG_CHARACTERS)
  ----------------------------------
  As coreografias e animações do jogo usam nomes Mixamo e são rotações
  relativas à T-pose. Cada skin carregada passa por dois ajustes:
    1. esqueletos da Unreal (UE4 Mannequin) e Biped (3ds Max) recebem os
       nomes Mixamo;
    2. braços e pernas são girados para a T-pose. Modelos exportados em
       A-pose já trazem pesos de skin, então a malha acompanha os ossos
       sem precisar de um novo bind.
*/

const UNREAL_TO_MIXAMO = {
  pelvis: 'Hips',
  spine_01: 'Spine',
  spine_02: 'Spine1',
  spine_03: 'Spine2',
  neck_01: 'Neck',
  head: 'Head'
};

const UNREAL_SIDE_BONES = {
  clavicle: 'Shoulder',
  upperarm: 'Arm',
  lowerarm: 'ForeArm',
  hand: 'Hand',
  thigh: 'UpLeg',
  calf: 'Leg',
  foot: 'Foot',
  ball: 'ToeBase'
};

const UNREAL_FINGERS = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  pinky: 'Pinky'
};

function mixamoNameForUnreal(name){

  if(UNREAL_TO_MIXAMO[name]){
    return `mixamorig${UNREAL_TO_MIXAMO[name]}`;
  }

  const sideBone =
    name.match(/^([a-z]+)_([lr])$/);

  if(sideBone && UNREAL_SIDE_BONES[sideBone[1]]){
    const side = sideBone[2] === 'l' ? 'Left' : 'Right';
    return `mixamorig${side}${UNREAL_SIDE_BONES[sideBone[1]]}`;
  }

  const finger =
    name.match(/^([a-z]+)_0(\d)_([lr])$/);

  if(finger && UNREAL_FINGERS[finger[1]]){
    const side = finger[3] === 'l' ? 'Left' : 'Right';
    return `mixamorig${side}Hand${UNREAL_FINGERS[finger[1]]}${finger[2]}`;
  }

  return null;

}

/*
  Biped do 3ds Max. O Biped tem só dois ossos de coluna; o segundo é o
  peito (pai do pescoço e das clavículas), então recebe o papel de Spine2.
*/
const BIPED_TO_MIXAMO = {
  Pelvis: 'Hips',
  Spine: 'Spine',
  Spine1: 'Spine2',
  Neck: 'Neck',
  Head: 'Head'
};

const BIPED_SIDE_BONES = {
  Clavicle: 'Shoulder',
  UpperArm: 'Arm',
  Forearm: 'ForeArm',
  Hand: 'Hand',
  Thigh: 'UpLeg',
  Calf: 'Leg',
  Foot: 'Foot',
  Toe0: 'ToeBase'
};

const BIPED_FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];

function mixamoNameForBiped(name){

  const center =
    name.match(/^Bip\d+_(\w+)$/);

  if(center && BIPED_TO_MIXAMO[center[1]]){
    return `mixamorig${BIPED_TO_MIXAMO[center[1]]}`;
  }

  const sideBone =
    name.match(/^Bip\d+_([LR])_(\w+)$/);

  if(!sideBone){
    return null;
  }

  const side = sideBone[1] === 'L' ? 'Left' : 'Right';

  if(BIPED_SIDE_BONES[sideBone[2]]){
    return `mixamorig${side}${BIPED_SIDE_BONES[sideBone[2]]}`;
  }

  /* Finger<dedo><falange>: Finger0 = polegar, Finger01 = 2ª falange. */
  const finger =
    sideBone[2].match(/^Finger(\d)(\d?)$/);

  if(finger && BIPED_FINGERS[finger[1]]){
    const joint = finger[2] === '' ? 1 : Number(finger[2]) + 1;
    return `mixamorig${side}Hand${BIPED_FINGERS[finger[1]]}${joint}`;
  }

  return null;

}

function renameBonesToMixamo(root){

  let renamed = 0;

  root.traverse(object => {
    if(!object.isBone){
      return;
    }

    /* Cenas do Mixamo com mais de um personagem geram "mixamorig1Hips". */
    const numbered =
      object.name.match(/^mixamorig\d+(\w+)$/);

    const mixamoName =
      (numbered && `mixamorig${numbered[1]}`) ||
      mixamoNameForUnreal(object.name) ||
      mixamoNameForBiped(object.name);

    if(mixamoName){
      object.name = mixamoName;
      renamed++;
    }
  });

  return renamed;

}

/*
  FBX exportados junto com uma animação podem chegar com os ossos num
  quadro da dança em vez da pose de bind. Recolocamos cada osso da skin na
  pose de bind (inversa da boneInverse), do quadril para as pontas. Como o
  FBXLoader duplica ossos, movemos o nó externo e mantemos o interno.
  É opcional (`restoreBindPose`): em alguns FBX a pose de bind gravada não
  corresponde à malha e a pose inicial dos ossos é a correta.
*/
function restoreBindPose(root){

  root.updateMatrixWorld(true);

  const bindWorld = new Map();

  root.traverse(object => {
    if(!object.isSkinnedMesh || !object.skeleton){
      return;
    }

    object.skeleton.bones.forEach((bone, index) => {
      if(!bindWorld.has(bone)){
        bindWorld.set(
          bone,
          object.skeleton.boneInverses[index].clone().invert()
        );
      }
    });
  });

  const relative = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const parentInverse = new THREE.Matrix4();

  root.traverse(object => {
    const target = bindWorld.get(object);

    if(!target){
      return;
    }

    const joint = jointNode(object);

    relative
      .copy(joint.matrixWorld)
      .invert()
      .multiply(object.matrixWorld);

    local.copy(target).multiply(relative.invert());

    if(joint.parent){
      parentInverse.copy(joint.parent.matrixWorld).invert();
      local.premultiply(parentInverse);
    }

    local.decompose(
      joint.position,
      joint.quaternion,
      joint.scale
    );

    joint.updateMatrixWorld(true);
  });

}

/*
  Alguns FBX gravam a bindMatrix como identidade mesmo quando a malha tem
  rotação própria (ex.: -90° em X). No modo "attached" o three.js anula
  essa rotação e o personagem aparece deitado. Se os ossos estão na pose
  de bind, refazemos o bind com a transformação real da malha.
*/
function fixDetachedBindMatrices(root){

  root.updateMatrixWorld(true);

  const product = new THREE.Matrix4();

  root.traverse(object => {
    if(!object.isSkinnedMesh || !object.skeleton){
      return;
    }

    if(object.bindMatrix.equals(object.matrixWorld)){
      return;
    }

    const { bones, boneInverses } = object.skeleton;

    const atBindPose =
      bones.every((bone, index) => {
        product.multiplyMatrices(bone.matrixWorld, boneInverses[index]);
        return product.elements.every((value, element) =>
          Math.abs(value - (element % 5 === 0 ? 1 : 0)) < 1e-3
        );
      });

    if(atBindPose){
      object.bind(object.skeleton, object.matrixWorld.clone());
    }
  });

}

/* O FBXLoader pode duplicar ossos (nó externo + filho homônimo); a animação gira o externo. */
function jointNode(node){

  while(node.parent?.name === node.name){
    node = node.parent;
  }

  return node;

}

function firstBonesByName(root){

  const bones = new Map();

  root.traverse(object => {
    if(object.isBone && !bones.has(object.name)){
      bones.set(object.name, object);
    }
  });

  return bones;

}

function poseToTPose(root){

  const bones =
    firstBonesByName(root);

  const hips = bones.get('mixamorigHips');
  const leftArm = bones.get('mixamorigLeftArm');

  if(!hips || !leftArm){
    return;
  }

  root.updateMatrixWorld(true);

  /* Lado esquerdo do personagem no espaço do mundo (independe do eixo do export). */
  const leftSign =
    Math.sign(
      leftArm.getWorldPosition(new THREE.Vector3()).x -
      hips.getWorldPosition(new THREE.Vector3()).x
    ) || 1;

  const pivot = new THREE.Vector3();
  const current = new THREE.Vector3();
  const delta = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();

  const align = (name, childName, direction) => {

    const bone = bones.get(name);
    const child = bones.get(childName);

    if(!bone || !child){
      return;
    }

    const joint = jointNode(bone);

    root.updateMatrixWorld(true);

    joint.getWorldPosition(pivot);

    child
      .getWorldPosition(current)
      .sub(pivot);

    if(current.lengthSq() < 1e-10){
      return;
    }

    delta.setFromUnitVectors(
      current.normalize(),
      direction
    );

    if(joint.parent){
      joint.parent.getWorldQuaternion(parentWorld);
    }else{
      parentWorld.identity();
    }

    joint.quaternion.premultiply(
      parentWorld
        .clone()
        .invert()
        .multiply(delta)
        .multiply(parentWorld)
    );

  };

  const down = new THREE.Vector3(0, -1, 0);

  for(const [side, sign] of [['Left', leftSign], ['Right', -leftSign]]){

    const outward =
      new THREE.Vector3(sign, 0, 0);

    align(`mixamorig${side}Arm`, `mixamorig${side}ForeArm`, outward);
    align(`mixamorig${side}ForeArm`, `mixamorig${side}Hand`, outward);
    align(`mixamorig${side}Hand`, `mixamorig${side}HandMiddle1`, outward);

    align(`mixamorig${side}UpLeg`, `mixamorig${side}Leg`, down);
    align(`mixamorig${side}Leg`, `mixamorig${side}Foot`, down);

  }

  root.updateMatrixWorld(true);

}

/* Remove do template as malhas que não estão em `keepMeshes` (adereços do FBX). */
function keepOnlyMeshes(root, names){

  const removed = [];

  root.traverse(object => {
    if(object.isMesh && !names.includes(object.name)){
      removed.push(object);
    }
  });

  for(const object of removed){
    object.removeFromParent();
  }

}

/*
  Apaga os triângulos presos a ossos de adereços soltos (ex.: armas que
  ficam paradas ao lado do personagem). A geometria passa a usar um índice
  só com os triângulos restantes, preservando os grupos de material.
*/
function removeTrianglesOfBones(root, boneNames){

  root.traverse(object => {
    if(!object.isSkinnedMesh){
      return;
    }

    const removedBones = new Set(
      object.skeleton.bones
        .map((bone, index) => boneNames.includes(bone.name) ? index : -1)
        .filter(index => index >= 0)
    );

    if(!removedBones.size){
      return;
    }

    const geometry = object.geometry;
    const skinIndex = geometry.getAttribute('skinIndex');
    const skinWeight = geometry.getAttribute('skinWeight');
    const source = geometry.index;
    const count = source ? source.count : geometry.getAttribute('position').count;

    const vertexAt = item =>
      source ? source.getX(item) : item;

    const usesRemovedBone = vertex => {
      for(let slot = 0; slot < 4; slot++){
        if(
          skinWeight.getComponent(vertex, slot) > 0.01 &&
          removedBones.has(skinIndex.getComponent(vertex, slot))
        ){
          return true;
        }
      }
      return false;
    };

    const hadGroups =
      geometry.groups.length > 0;

    const groups =
      hadGroups
        ? geometry.groups
        : [{ start: 0, count, materialIndex: 0 }];

    const indices = [];
    const keptGroups = [];

    for(const group of groups){
      const start = indices.length;

      for(let item = group.start; item < group.start + group.count; item += 3){
        const triangle = [vertexAt(item), vertexAt(item + 1), vertexAt(item + 2)];

        if(!triangle.some(usesRemovedBone)){
          indices.push(...triangle);
        }
      }

      keptGroups.push({
        start,
        count: indices.length - start,
        materialIndex: group.materialIndex
      });
    }

    geometry.setIndex(indices);
    geometry.clearGroups();

    if(hadGroups){
      for(const group of keptGroups){
        geometry.addGroup(group.start, group.count, group.materialIndex);
      }
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  });

}

function prepareSongCharacter(group, entry = {}){

  if(entry.restoreBindPose){
    restoreBindPose(group);
  }

  fixDetachedBindMatrices(group);

  if(entry.keepMeshes){
    keepOnlyMeshes(group, entry.keepMeshes);
  }

  if(entry.removeBones){
    removeTrianglesOfBones(group, entry.removeBones);
  }

  if(!hasMixamoRig(group)){
    renameBonesToMixamo(group);
  }

  if(!hasMixamoRig(group)){
    throw new Error(
      'O modelo não possui um esqueleto Mixamo, Unreal ou Biped reconhecido.'
    );
  }

  poseToTPose(group);

  group.traverse(object => {
    if(!object.isSkinnedMesh){
      return;
    }

    /* A caixa de culling é calculada na pose inicial; a dança sai dela. */
    object.frustumCulled = false;

    /*
      Cabelo/cílios com mapa de opacidade viram recorte (alphaTest): com
      transparência real o three.js ordena por objeto e partes somem.
    */
    for(const material of [object.material].flat()){
      if(material?.alphaMap){
        material.transparent = false;
        material.alphaTest = 0.5;
        material.depthWrite = true;
        material.needsUpdate = true;
      }
    }
  });

  group.userData.songSkin = true;

  return group;

}

const EMPTY_TEXTURE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function songCharacterKey(songId, playerId){

  return `${songId}:${playerId}`;

}

const songCharacterLoads = new Set();

/* Carrega as skins de uma música na primeira vez em que ela é selecionada. */
function loadSongCharacters(songId){

  const players = SONG_CHARACTERS[songId];

  if(!players || songCharacterLoads.has(songId)){
    return;
  }

  songCharacterLoads.add(songId);


  for(const playerId of ['p1', 'p2']){

    const entry = players[playerId];

    if(!entry){
      continue;
    }

    const key =
      songCharacterKey(songId, playerId);

    const manager =
      new THREE.LoadingManager();

    if(entry.textures){
      /* Troca o caminho gravado no FBX (ex.: C:\...\TEXTURES\) pela pasta do jogo. */
      manager.setURLModifier(url => {
        if(/^(blob|data):/.test(url) || !/\.(png|jpe?g|tga)$/i.test(url)){
          return url;
        }

        const fileName =
          decodeURIComponent(url).split(/[\\/]/).pop();

        /* Texturas pedidas pelo FBX mas ausentes viram um pixel vazio, sem 404. */
        if(entry.textureFiles && !entry.textureFiles.includes(fileName)){
          return EMPTY_TEXTURE;
        }

        return entry.textures + fileName;
      });
    }

    new FBXLoader(manager).load(
      entry.url,

      group => {

        try{
          songCharacterModels[songId] ??= {};
          songCharacterModels[songId][playerId] =
            prepareSongCharacter(group, entry);
          songCharacterErrors.delete(key);
        }catch(error){
          console.error(
            `Falha ao preparar a skin ${playerId.toUpperCase()} de ${songId}:`,
            error
          );
          songCharacterErrors.add(key);
        }

        updateMenuAvailability();

        /* O personagem de espera do menu troca para a skin assim que ela chega. */
        if(
          playerId === 'p1' &&
          songId === selectedSong &&
          !songChosenByUser
        ){
          showMenuCharacterWaiting();
        }

      },

      undefined,

      error => {

        console.error(
          `Erro ao carregar a skin ${playerId.toUpperCase()} de ${songId}:`,
          error
        );

        songCharacterErrors.add(key);
        updateMenuAvailability();

      }
    );

  }

}

/* Retorna a skin da música ou null (falha no carregamento cai no personagem padrão). */
function getSongCharacter(songId, playerId){

  if(songCharacterErrors.has(songCharacterKey(songId, playerId))){
    return null;
  }

  return songCharacterModels[songId]?.[playerId] || null;

}

function songCharactersReady(songId){

  const entry = SONG_CHARACTERS[songId];

  if(!entry){
    return true;
  }

  return ['p1', 'p2'].every(playerId =>
    !entry[playerId] ||
    songCharacterErrors.has(songCharacterKey(songId, playerId)) ||
    Boolean(songCharacterModels[songId]?.[playerId])
  );

}

Object.assign(globalThis, {
  renameBonesToMixamo,
  poseToTPose,
  prepareSongCharacter,
  loadSongCharacters,
  getSongCharacter,
  songCharactersReady
});
