# Ajustes v2.17 — Compatibilidade com Meta Quest

## Como funciona
O jogo detecta o **Meta Quest Browser** pelos tokens estáveis do user-agent (`OculusBrowser` e `Quest 2` / `Quest 3` / `Quest Pro`) e liga o modo Quest com a classe `body.quest-browser`. Ele roda na janela 2D do navegador (1280 × 670 por padrão), já que todo o HUD (notas, receptores, placar) é DOM e não aparece numa sessão WebXR imersiva.

- **Laser do controle ou pinça da mão:** aponte para a pista e aperte o gatilho. A coluna inteira da pista aceita o clique, e a pista sob o laser fica destacada. No Extremo, a 5ª pista é o especial.
- **Controle Bluetooth (Xbox/PlayStation):** direcional ou `X Y A B` nas pistas (ordem ← ↑ ↓ →), `LB/RB/LT/RT` no especial e `Start` para pausar. O primeiro controle é o P1 e o segundo é o P2. Isso também funciona no desktop.
- **Desempenho:** pixel ratio limitado a 1 e sombra PCF simples no lugar da PCFSoft.
- **Interface:** os textos que citam teclado (Enter, Esc, dica das pistas) trocam por instruções de gatilho/laser. O menu fica compacto em janelas baixas para o botão INICIAR PARTIDA caber em 670 px. O botão de pausa fica maior.

No desktop nada muda. Para testar o modo Quest no PC, abra `?quest=1`. Para desligar a detecção, use `?quest=0`.

## Abrir no headset
1. `npm run dev:quest` (o Vite passa a escutar na rede local).
2. No Quest Browser, abra `http://<IP-do-PC>:5173` (o PC e o headset precisam estar na mesma rede).
3. Aperte o gatilho em **APERTE O GATILHO PARA COMEÇAR**.

Por http na rede local, o navegador pode bloquear a Gamepad API (contexto não seguro). O laser funciona normalmente. Para usar controle Bluetooth, sirva o jogo por HTTPS.

## Arquivos
- `src/platform/quest.js` (novo): detecção e perfil de renderização
- `src/gameplay/pointer-input.js` (novo): laser/pinça nas pistas
- `src/gameplay/gamepad-input.js` (novo): Gamepad API
- `src/gameplay/input.js`: `pressPlayerLane` e `togglePause` compartilhados por teclado, laser e gamepad
- `src/scene/stage.js`: usa o perfil de renderização
- `src/main.js`, `index.html`, `src/style.css`, `src/ui/menu.css`
- `scripts/test-quest.mjs` (novo), `scripts/validate-modular.mjs`, `package.json`

## Fora do escopo
- Modo VR imersivo (WebXR): exigiria reconstruir a pista de notas e o HUD em 3D dentro da cena.
- 2 jogadores no mesmo headset: o P2 funciona por laser na pista vermelha ou por um segundo controle Bluetooth.

## Validação
- `npm test`: 13/13 ✅
- `npm run check:architecture` ✅
- Chrome headless com o UA do Quest 3 em 1280 × 670: detecção, intro, menu inteiro visível, cliques nas pistas viram entradas do P1, pausa ✅
- Mesmo fluxo com `?quest=0`: layout e comportamento do desktop inalterados ✅
