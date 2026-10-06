import * as THREE from 'three';

/*
  Arquivo gerado por scripts/build-dance.mjs:
  por frame, a rotação de cada osso NO MUNDO relativa à T-pose e o
  deslocamento do quadril relativo à T-pose (int16 em base64).
*/
export async function loadPackedDance(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${url} (${response.status}).`);
  }

  const file = await response.json();

  if (file.version !== 2) {
    throw new Error(`Versão de coreografia não suportada: ${file.version}.`);
  }

  return file;
}

/*
  Aplica a coreografia ao esqueleto de `model` (em T-pose, intacto):
  rotação no mundo = rotação gravada × T-pose do alvo, convertida para
  rotação local. Funciona mesmo quando os eixos locais dos ossos diferem
  entre o rig original e o do jogo.
  Retorna { nomeDoClip: THREE.AnimationClip }.
*/
export function retargetPackedClips(file, model) {
  model.updateMatrixWorld(true);

  const bones = [];
  const first = new Map();

  model.traverse(object => {
    if (!object.isBone) {
      return;
    }

    bones.push(object);

    /* Mixamo duplica cada osso; o three.js anima o primeiro com o nome. */
    if (!first.has(object.name)) {
      first.set(object.name, object);
    }
  });

  const rest = new Map(
    bones.map(bone => [
      bone,
      {
        local: bone.quaternion.clone(),
        world: bone.getWorldQuaternion(new THREE.Quaternion()),
        parentWorld: bone.parent
          ? bone.parent.getWorldQuaternion(new THREE.Quaternion())
          : new THREE.Quaternion()
      }
    ])
  );

  const hips = first.get('mixamorigHips');

  if (!hips) {
    throw new Error('Personagem sem osso mixamorigHips.');
  }

  const hipsRest = hips.getWorldPosition(new THREE.Vector3());
  const hipsScale = hipsRest.y / file.sourceHipsHeight;

  const toHipsParent = hips.parent
    ? hips.parent.matrixWorld.clone().invert()
    : new THREE.Matrix4();

  return Object.fromEntries(
    file.clips.map(clip => [
      clip.name,
      retargetClip(clip, file.fps, { bones, first, rest, hips, hipsRest, hipsScale, toHipsParent })
    ])
  );
}

function retargetClip(clip, fps, target) {
  const { bones, first, rest, hips, hipsRest, hipsScale, toHipsParent } = target;
  const { frames } = clip;

  const rotations = new Map();
  let offsets = null;

  for (const track of clip.tracks) {
    const values = Float32Array.from(
      decode(track.data),
      value => value / track.scale
    );

    if (track.type === 'offset') {
      offsets = values;
    } else if (first.has(track.bone)) {
      rotations.set(first.get(track.bone), values);
    }
  }

  const output = new Map(
    [...rotations.keys()].map(bone => [bone, new Float32Array(frames * 4)])
  );

  const hipsValues = new Float32Array(frames * 3);

  const world = new Map(
    bones.map(bone => [bone, new THREE.Quaternion()])
  );

  const delta = new THREE.Quaternion();
  const local = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();
  const position = new THREE.Vector3();

  for (let frame = 0; frame < frames; frame++) {
    for (const bone of bones) {
      const info = rest.get(bone);
      const posed = world.get(bone);

      const parentWorld = bone.parent && world.has(bone.parent)
        ? world.get(bone.parent)
        : info.parentWorld;

      const values = rotations.get(bone);

      if (values) {
        delta.fromArray(values, frame * 4).normalize();
        posed.multiplyQuaternions(delta, info.world);

        local.multiplyQuaternions(inverse.copy(parentWorld).invert(), posed);
        local.toArray(output.get(bone), frame * 4);
      } else {
        /* Osso sem animação (ou duplicado): acompanha o pai. */
        posed.multiplyQuaternions(parentWorld, info.local);
      }
    }

    if (offsets) {
      position
        .fromArray(offsets, frame * 3)
        .multiplyScalar(hipsScale)
        .add(hipsRest)
        .applyMatrix4(toHipsParent)
        .toArray(hipsValues, frame * 3);
    }
  }

  const times = Float32Array.from(
    { length: frames },
    (_, frame) => frame / fps
  );

  const tracks = [...output].map(
    ([bone, values]) =>
      new THREE.QuaternionKeyframeTrack(
        bone.name + '.quaternion',
        times,
        values
      )
  );

  if (offsets) {
    tracks.push(
      new THREE.VectorKeyframeTrack(
        hips.name + '.position',
        times,
        hipsValues
      )
    );
  }

  return new THREE.AnimationClip(
    clip.name,
    (frames - 1) / fps,
    tracks
  );
}

function decode(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Int16Array(bytes.buffer);
}
