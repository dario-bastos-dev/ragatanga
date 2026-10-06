// Une as animações de uma música (FBX do Mixamo) em um único arquivo para o jogo.
//
// Uso:
//   node scripts/build-dance.mjs            (todas as danças)
//   node scripts/build-dance.mjs ymca       (só uma)
//
// Entrada: assets-src/<id>/*.fbx (lista em DANCES abaixo)
// Saída:   public/assets/animations/<id>.json
//
// O que o script faz:
// - posa o esqueleto original de cada FBX a 30 fps e grava, para cada osso,
//   a rotação NO MUNDO em relação à T-pose. Esse formato não depende dos
//   eixos locais do rig: o jogo reaplica as rotações sobre a T-pose do
//   personagem dele (src/dances/packed-clips.js);
// - grava o deslocamento do quadril em relação à T-pose; com removeDrift,
//   tira a deriva (as partes do Thriller andam até 4 m pelo palco), mantendo
//   o balanço local e limitando o quadril a ~45 cm do centro do círculo;
// - emenda as partes com crossfade, formando o clip "dance";
// - guarda o idle, se houver, como clip "idle" (usado quando o jogador erra);
// - quantiza em int16 + base64 (o arquivo fica ~10× menor que os FBX).

import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const DANCES = {
  thriller: {
    parts: [
      'Thriller Part 1',
      'Thriller Part 2',
      'Thriller Part 3',
      'Thriller Part 4'
    ],
    idle: 'Thriller Idle',
    removeDrift: true
  },

  /* Loop de 4,5 s que quase não sai do lugar: mantido como está. */
  ymca: {
    parts: ['Ymca_Dance'],
    idle: null,
    removeDrift: false
  },

  /* Loop de 8,2 s com os 16 tempos da coreografia, de frente. */
  macarena: {
    parts: ['Macarena Dance'],
    idle: null,
    removeDrift: false
  }
};

const FPS = 30;
const CROSSFADE_FRAMES = Math.round(0.4 * FPS);
const DRIFT_WINDOW_FRAMES = Math.round(2 * FPS);

/* Raio máximo (cm) do quadril em torno do centro, com limite suave. */
const MAX_RADIUS = 45;

/* Fatores de quantização int16. */
const SCALE = {
  rotation: 32767,
  offset: 10 // cm → mm
};

const HIPS = 'mixamorigHips';

/* O FBXLoader avisa sobre recursos que não usamos (malha, materiais). */
const warn = console.warn;
console.warn = () => {};

/*
  Posa o rig original com a própria animação e extrai, por frame:
  - rotation: quaternion no mundo relativo à T-pose, por osso animado;
  - offset: posição do quadril no mundo relativa à T-pose.
*/
function sample(source, name) {
  const buffer = readFileSync(new URL(`${name}.fbx`, source));

  const group = new FBXLoader().parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    ''
  );

  const clip = group.animations[0];

  if (!clip) {
    throw new Error(`${name}.fbx não tem animação.`);
  }

  group.updateMatrixWorld(true);

  /*
    O FBX do Mixamo duplica cada osso (nó + filho com o mesmo nome).
    A animação se liga ao primeiro nó com o nome, como no three.js.
  */
  const bones = new Map();

  group.traverse(object => {
    if (object.isBone && !bones.has(object.name)) {
      bones.set(object.name, object);
    }
  });

  const animated = clip.tracks
    .filter(track => track.name.endsWith('.quaternion'))
    .map(track => track.name.replace(/\.quaternion$/, ''))
    .filter(bone => bones.has(bone));

  const restInverse = new Map(
    animated.map(bone => [
      bone,
      bones.get(bone).getWorldQuaternion(new THREE.Quaternion()).invert()
    ])
  );

  const hips = bones.get(HIPS);
  const restHips = hips.getWorldPosition(new THREE.Vector3());

  const frames = Math.round(clip.duration * FPS) + 1;
  const tracks = new Map();

  for (const bone of animated) {
    tracks.set(bone, {
      type: 'rotation',
      size: 4,
      values: new Float32Array(frames * 4)
    });
  }

  const offset = {
    type: 'offset',
    size: 3,
    values: new Float32Array(frames * 3)
  };

  const mixer = new THREE.AnimationMixer(group);

  mixer.clipAction(clip).play();

  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();

  for (let frame = 0; frame < frames; frame++) {
    mixer.setTime(frame / FPS);
    group.updateMatrixWorld(true);

    for (const bone of animated) {
      bones.get(bone)
        .getWorldQuaternion(q)
        .multiply(restInverse.get(bone))
        .toArray(tracks.get(bone).values, frame * 4);
    }

    hips.getWorldPosition(p).sub(restHips).toArray(offset.values, frame * 3);
  }

  tracks.set(HIPS + '.offset', offset);

  return { frames, tracks, hipsHeight: restHips.y };
}

/*
  Remove a deriva horizontal (x, z) do quadril subtraindo uma média móvel.
  As bordas são espelhadas em ponto, o que preserva tendências lineares e
  evita "puxões" no começo/fim de cada parte.
*/
function removeDrift(sampled) {
  const track = sampled.tracks.get(HIPS + '.offset');
  const { frames } = sampled;
  const half = Math.floor(DRIFT_WINDOW_FRAMES / 2);

  for (const axis of [0, 2]) {
    const original = Array.from(
      { length: frames },
      (_, frame) => track.values[frame * 3 + axis]
    );

    const at = index => {
      if (index < 0) {
        return 2 * original[0] - original[-index];
      }

      if (index >= frames) {
        return 2 * original[frames - 1] - original[2 * (frames - 1) - index];
      }

      return original[index];
    };

    for (let frame = 0; frame < frames; frame++) {
      let sum = 0;

      for (let k = -half; k <= half; k++) {
        sum += at(frame + k);
      }

      track.values[frame * 3 + axis] =
        original[frame] - sum / (2 * half + 1);
    }
  }

  /*
    Deslocamentos rápidos (ex.: fim da Part 4) escapam da média móvel;
    o tanh mantém movimentos pequenos quase intactos e limita os grandes.
  */
  for (let frame = 0; frame < frames; frame++) {
    const x = track.values[frame * 3];
    const z = track.values[frame * 3 + 2];
    const radius = Math.hypot(x, z);

    if (radius > 0) {
      const factor = MAX_RADIUS * Math.tanh(radius / MAX_RADIUS) / radius;

      track.values[frame * 3] = x * factor;
      track.values[frame * 3 + 2] = z * factor;
    }
  }
}

const smooth = x => x * x * (3 - 2 * x);

/* Emenda b depois de a, misturando os últimos/primeiros frames. */
function append(a, b) {
  const overlap = Math.min(CROSSFADE_FRAMES, a.frames, b.frames);
  const frames = a.frames + b.frames - overlap;
  const tracks = new Map();

  for (const [name, ta] of a.tracks) {
    const tb = b.tracks.get(name);

    if (!tb) {
      throw new Error(`Osso ${name} ausente em uma das partes.`);
    }

    const { size, type } = ta;
    const values = new Float32Array(frames * size);

    values.set(ta.values);

    const start = a.frames - overlap;

    for (let k = 0; k < overlap; k++) {
      const w = smooth((k + 1) / (overlap + 1));
      const out = (start + k) * size;
      const from = (start + k) * size;
      const to = k * size;

      if (type === 'rotation') {
        THREE.Quaternion.slerpFlat(values, out, ta.values, from, tb.values, to, w);
      } else {
        for (let i = 0; i < size; i++) {
          values[out + i] = ta.values[from + i] * (1 - w) + tb.values[to + i] * w;
        }
      }
    }

    values.set(tb.values.subarray(overlap * size), a.frames * size);

    tracks.set(name, { type, size, values });
  }

  return { frames, tracks, hipsHeight: a.hipsHeight };
}

function pack(name, sampled) {
  return {
    name,
    frames: sampled.frames,
    tracks: [...sampled.tracks].map(([trackName, track]) => {
      const scale = SCALE[track.type];

      const ints = Int16Array.from(track.values, value =>
        Math.max(-32768, Math.min(32767, Math.round(value * scale)))
      );

      return {
        bone: trackName.replace(/\.offset$/, ''),
        type: track.type,
        scale,
        data: Buffer.from(ints.buffer).toString('base64')
      };
    })
  };
}

function build(id) {
  const config = DANCES[id];
  const source = new URL(`../assets-src/${id}/`, import.meta.url);
  const output = new URL(`../public/assets/animations/${id}.json`, import.meta.url);

  let dance = null;

  for (const part of config.parts) {
    const sampled = sample(source, part);

    if (config.removeDrift) {
      removeDrift(sampled);
    }

    dance = dance ? append(dance, sampled) : sampled;
  }

  const clips = [pack('dance', dance)];

  if (config.idle) {
    const idle = sample(source, config.idle);

    if (config.removeDrift) {
      removeDrift(idle);
    }

    clips.push(pack('idle', idle));
  }

  const file = {
    version: 2,
    fps: FPS,
    sourceHipsHeight: dance.hipsHeight,
    clips
  };

  writeFileSync(output, JSON.stringify(file));

  return `${id}: ${clips.map(c => `${c.name} ${((c.frames - 1) / FPS).toFixed(1)} s`).join(' · ')} → ${output.pathname}`;
}

const ids = process.argv.slice(2);

for (const id of ids.length ? ids : Object.keys(DANCES)) {
  if (!DANCES[id]) {
    console.warn = warn;
    console.error(`Dança desconhecida: ${id}. Opções: ${Object.keys(DANCES).join(', ')}`);
    process.exit(1);
  }

  const summary = build(id);

  console.warn = warn;
  console.log(summary);
  console.warn = () => {};
}
