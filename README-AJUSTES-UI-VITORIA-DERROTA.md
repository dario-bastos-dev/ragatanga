# You Dance v2.17 — ajustes de derrota, performance e menus

## Alterações
- WASTED permanece visível como fundo enquanto o menu de derrota está aberto.
- O menu de derrota passou a ter fundo mais translúcido para preservar o efeito cinematográfico.
- Medidor de performance atualizado para a identidade You Dance: Liquid Glass, neon ciano/roxo/rosa, estados de atenção e perigo e novo indicador luminoso.
- Contador de erros consecutivos também recebeu tratamento visual alinhado ao HUD.
- Logo superior removida da sequência final `YOU DANCE!`; permanece somente o texto.
- Sons GTA de seleção adicionados aos botões dos menus de pausa e resultado/vitória.
- Ao abrir o menu final de vitória, a música tema do menu passa a tocar em loop no mesmo volume configurado para o menu principal.

## Arquitetura
A separação modular foi preservada:
- áudio em `src/audio/music.js`;
- controles em `src/ui/controls.js`;
- resultado em `src/ui/results.js`;
- derrota em `src/gameplay/session.js`;
- apresentação em `src/style.css` e `index.html`.

## Validação
- Sintaxe JavaScript validada com `node --check`.
- `scripts/validate-modular.mjs` validado com sucesso.
