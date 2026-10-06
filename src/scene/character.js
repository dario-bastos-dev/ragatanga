import * as THREE from 'three';

import {
  FBXLoader
} from 'three/addons/loaders/FBXLoader.js';

import * as SkeletonUtils
  from 'three/addons/utils/SkeletonUtils.js';

import {
  CHARACTER_MODEL_URL,
  CHARACTER_HEIGHT
} from '../config/gameplay.js';

import {
  scene
} from './stage.js';

/*
  Personagem base (Samba Dancing.fbx). P1 e P2 são clones dele:
  mesmo esqueleto, mesma escala e mesma postura.
*/
export let baseModel = null;

export function isCharacterLoaded(){

  return baseModel !== null;

}

export function loadCharacter(
  onLoaded,
  onError
){

  const loader =
    new FBXLoader();

  loader.load(
    CHARACTER_MODEL_URL,

    group => {

      baseModel = group;

      onLoaded();

    },

    undefined,

    error => {

      console.error(
        'Erro P1:',
        error
      );

      onError();

    }
  );

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

/*
  P2 = cópia exata do P1
  ----------------------
  A única diferença é visual:
  os materiais recebem uma coloração vermelha.
*/
function tintRed(
  object
){

  const red =
    new THREE.Color(
      0xff314d
    );

  object.traverse(
    child => {

      if(
        !child.isMesh ||
        !child.material
      ){
        return;
      }

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
  );

}

/* Clona o personagem base e o coloca no palco na posição x. */
export function createCharacter(
  x,
  {
    tinted = false
  } = {}
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

  if(tinted){
    tintRed(object);
  }

  placeModel(
    object,
    x,
    CHARACTER_HEIGHT
  );

  scene.add(object);

  return object;

}
