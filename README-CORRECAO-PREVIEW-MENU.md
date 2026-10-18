# Correção v2.17 — Preview do menu + retomada da trilha tema

## Corrigido
- restaura o preview de 10 segundos ao selecionar uma música;
- P1 volta a executar a coreografia correspondente durante o preview;
- corrige a variável `gameplayIdleReady` no escopo de `canStartSelectedSong`, que impedia o fluxo de disponibilidade/preview;
- a trilha tema do menu agora é **pausada sem zerar a posição** quando um preview começa;
- ao terminar os 10 segundos, a trilha tema volta exatamente do ponto onde havia parado;
- ao trocar de música, a posição da trilha tema continua preservada enquanto o preview assume o áudio;
- arquitetura modular preservada.

## Arquivos alterados
- `src/ui/menu.js`
- `src/audio/music.js`

## Validação
- `node scripts/validate-modular.mjs` ✅
- `node --check src/ui/menu.js` ✅
- `node --check src/audio/music.js` ✅
