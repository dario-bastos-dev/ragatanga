# Ajustes v2.17 — Wasted + Responsividade

## Alterações aplicadas
- derrota cinematográfica com overlay **WASTED**;
- sincronização do texto **wasted** aos **2s** do áudio;
- uso da **Pricedown font** via `public/assets/fonts/Pricedown-Bl.otf`;
- áudio `public/assets/audio/ui/wasted.mp3` integrado ao fluxo de derrota;
- slow motion visual, preto e branco, vinheta suave e barra preta translúcida;
- tela de derrota padrão continua aparecendo ao final, com botões de ação;
- responsividade do menu inicial ajustada para melhorar a visualização em **zoom 100%**;
- arquitetura modular preservada.

## Arquivos alterados
- `index.html`
- `src/style.css`
- `src/config/gameplay.js`
- `src/core/state.js`
- `src/audio/music.js`
- `src/gameplay/session.js`
- `public/assets/audio/ui/wasted.mp3`
- `public/assets/fonts/Pricedown-Bl.otf`

## Validação
- `node scripts/validate-modular.mjs` ✅
- `node --check` nos arquivos alterados ✅
