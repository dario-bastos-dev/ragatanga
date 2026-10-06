// Gera um beatmap (mesmo formato de src/beatmaps/ragatanga.json) a partir de BPM fixo.
//
// Uso:
//   node scripts/generate-beatmap.mjs <songId> <title> <bpm> <audioStart> <duration> [offset]
//
// - audioStart: segundo do mp3 onde a partida começa
// - duration:   duração da partida em segundos
// - offset:     segundos entre audioStart e a primeira batida (ajuste fino de sincronia)
//
// Exemplo (Thriller):
//   node scripts/generate-beatmap.mjs thriller "Thriller" 118.143 97.7 50 0.158

import { writeFileSync } from 'node:fs';

const [songId, title, bpmArg, startArg, durationArg, offsetArg = '0'] =
  process.argv.slice(2);

if (!songId || !title || !bpmArg || !startArg || !durationArg) {
  console.error(
    'Uso: node scripts/generate-beatmap.mjs <songId> <title> <bpm> <audioStart> <duration> [offset]'
  );
  process.exit(1);
}

const bpm = Number(bpmArg);
const audioStart = Number(startArg);
const duration = Number(durationArg);
const offset = Number(offsetArg);

if ([bpm, audioStart, duration, offset].some(Number.isNaN) || bpm <= 0) {
  console.error('Valores numéricos inválidos.');
  process.exit(1);
}

const interval = 60 / bpm;
const beats = [];

for (let time = offset; time < duration; time += interval) {
  beats.push(Number(time.toFixed(6)));
}

const beatmap = {
  songId,
  title,
  audioStart,
  audioEnd: audioStart + duration,
  duration,
  detectedBpm: bpm,
  beatCount: beats.length,
  beats
};

const output = new URL(`../src/beatmaps/${songId}.json`, import.meta.url);

writeFileSync(output, JSON.stringify(beatmap, null, 2));

console.log(`${beats.length} batidas → ${output.pathname}`);
