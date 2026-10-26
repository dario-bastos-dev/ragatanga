import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const expected = [
  'src/main.js',
  'src/config/songs.js',
  'src/config/difficulties.js',
  'src/config/gameplay.js',
  'src/config/stage-looks.js',
  'src/core/state.js',
  'src/core/utils.js',
  'src/core/leaderboard.js',
  'src/audio/music.js',
  'src/scene/stage.js',
  'src/scene/characters.js',
  'src/scene/dancers.js',
  'src/scene/thriller-skin.js',
  'src/scene/song-skins.js',
  'src/gameplay/chart.js',
  'src/gameplay/input.js',
  'src/gameplay/judge.js',
  'src/gameplay/session.js',
  'src/ui/menu.js',
  'src/ui/hud.js',
  'src/ui/results.js',
  'src/ui/leaderboard.js',
  'src/ui/controls.js',
  'src/ui/intro.js',
  'src/ui/menu-navigation.js',
  'src/ui/intro-show.js',
  'src/audio/intro-reactivity.js',
  'src/platform/quest.js',
  'src/gameplay/pointer-input.js',
  'src/gameplay/gamepad-input.js'
];

const missing = expected.filter(path => !existsSync(resolve(root, path)));
if (missing.length) {
  console.error('Módulos ausentes:', missing.join(', '));
  process.exit(1);
}

const mainPath = resolve(root, 'src/main.js');
const mainSize = statSync(mainPath).size;
if (mainSize > 2500) {
  console.error(`src/main.js voltou a concentrar lógica (${mainSize} bytes).`);
  process.exit(1);
}

const main = readFileSync(mainPath, 'utf8');
for (const forbidden of ['buildAutoRiggedThrillerSkin(', 'function updateGame(', 'function showNormalResults(']) {
  if (main.includes(forbidden)) {
    console.error(`Implementação de domínio encontrada no orquestrador: ${forbidden}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
if (pkg.version !== '2.17.0') {
  console.error(`Versão esperada 2.17.0; encontrada ${pkg.version}`);
  process.exit(1);
}

console.log(`Arquitetura modular validada: ${expected.length} módulos esperados; main.js = ${mainSize} bytes.`);
