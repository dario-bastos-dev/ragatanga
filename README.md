# Ragatanga — Rhythm MVP 1.2

## Rodar

```bash
npm install
npm run dev
```

## Principal correção desta versão

O P2 vermelho não usa mais `mixamo.fbx`.

Agora:

- P1 = `Samba Dancing.fbx`
- P2 = clone do mesmo `Samba Dancing.fbx`
- os dois usam exatamente o mesmo esqueleto
- os dois usam exatamente o mesmo clip Samba Dancing
- não existe retargeting entre esqueletos
- não existe risco de T-pose, pernas invertidas ou postura quebrada por incompatibilidade de rig

A única diferença do P2 é visual:

- materiais clonados
- tonalidade vermelha aplicada aos materiais
- textura e iluminação preservadas

## Gameplay

Música:

- 1:32 → 2:22
- 50 segundos
- BPM detectado: 123.05
- batidas mapeadas: 102

## Dificuldades

- Fácil: 1 a cada 4 batidas · 3,5 s
- Normal: 1 a cada 2 batidas · 2,8 s
- Difícil: todas as batidas · 2,2 s
- Extremo: todas as batidas · 1,8 s

### Extremo

P1:

`A W S D X`

P2:

`↑ ← ↓ → ENTER`

O quinto receptor fica na mesma linha dos demais.

## Músicas

Cada música tem um beatmap em `src/beatmaps/<id>.json`, um mp3 em `public/assets/audio/<id>.mp3` e uma entrada em `SONGS` no `src/main.js` (sementes `seedP1`/`seedP2` definem a coreografia de notas de cada jogador).

| Música | Arquivo de áudio | BPM | Janela | Dança |
| --- | --- | --- | --- | --- |
| Ragatanga | `ragatanga.mp3` | 123,05 | 1:32 → 2:22 | Samba Dancing |
| Thriller | `thriller.mp3` | 118,14 (medido no áudio) | 1:37 → 2:27 | Thriller (Mixamo) |
| YMCA | `ymca.mp3` | ~126,7 (bateria ao vivo, 125,0–128,0) | 1:00 → 1:50 | YMCA Dance (Mixamo) |
| Macarena | `macarena.mp3` | ~103,0 (101,9–103,7) | 0:41 → 1:31 | Macarena Dance (Mixamo) |

O beatmap do Thriller (Single Version, 5:12) é uma grade fixa medida no mp3: 118,143 BPM e primeira batida 0,158 s após o início da janela (erro rms de 3,7 ms contra os ataques reais). A janela começa numa fronteira de seção, no trecho de maior energia da música, e dura 50 s — o tempo das Parts 1 e 2 da coreografia. Para mudar a janela, regenere com o novo início e o offset da primeira batida:

```bash
node scripts/generate-beatmap.mjs thriller "Thriller" 118.143 97.7 50 0.158
```

Os beatmaps do YMCA e da Macarena seguem as batidas reais, localizadas no áudio e suavizadas com regressão local (erro rms de 6,5 ms e 5,6 ms). Isso importa no YMCA: a gravação de 1978 tem bateria tocada ao vivo e uma grade fixa erraria até 43 ms. As janelas começam no primeiro refrão, identificado como o trecho que mais se repete na música ("It's fun to stay at the Y-M-C-A" em 1:01; "Dale a tu cuerpo alegría, Macarena" em 0:42). Para refazer (requer `ffmpeg` e `numpy`):

```bash
python3 scripts/analyze-audio.py public/assets/audio/ymca.mp3 structure      # BPM e seções
python3 scripts/analyze-audio.py public/assets/audio/ymca.mp3 beatmap ymca "YMCA" 61.10
python3 scripts/analyze-audio.py public/assets/audio/macarena.mp3 structure
python3 scripts/analyze-audio.py public/assets/audio/macarena.mp3 beatmap macarena "Macarena" 41.99
```

### Coreografias do Mixamo (Thriller, YMCA e Macarena)

Os FBX do Mixamo ficam em `assets-src/<id>/`, fora do `public/` e do git (os termos da Adobe não permitem redistribuir os FBX). O script abaixo une os FBX de cada música em um único arquivo, `public/assets/animations/<id>.json`; a lista de arquivos de cada dança fica em `DANCES`, no próprio script:

```bash
node scripts/build-dance.mjs          # todas
node scripts/build-dance.mjs ymca     # só uma
```

- Thriller: Part 1 → 4 viram o clip `dance` (110 s, emendas com crossfade); a Idle vira o clip `idle` (~1,9 MB).
- YMCA: o loop `Ymca_Dance` (4,5 s) vira o clip `dance` (~80 KB).
- Macarena: o loop `Macarena Dance` (8,2 s, os 16 tempos da coreografia) vira o clip `dance` (~144 KB).
- Sem idle (YMCA e Macarena), o personagem congela quando o jogador erra, como no Ragatanga.
- Com `danceBeats` em `SONGS`, o clip vira um loop de N batidas que avança pelas batidas do beatmap, acompanhando as oscilações de andamento. O YMCA usa 10 batidas por loop (≈ velocidade original da captura); a Macarena usa 16 (um tempo da coreografia por batida, 4 compassos).
- As rotações são gravadas no espaço do mundo relativas à T-pose e reaplicadas no personagem do jogo (`src/dances/packed-clips.js`), porque os eixos locais dos ossos do rig do Mixamo padrão diferem dos do Samba Dancing.
- No Thriller, a deriva do quadril é removida (as partes originais andam até 4 m) e o quadril fica a no máximo ~45 cm do centro do círculo.
- Com idle, o personagem faz o idle enquanto o jogador erra e volta à coreografia (com fade) quando acerta.

### Billie Jean (desativada)

A coreografia procedural do Billie Jean continua em `src/dances/billie-jean.js`, mas saiu do menu (o áudio e o beatmap foram removidos).
