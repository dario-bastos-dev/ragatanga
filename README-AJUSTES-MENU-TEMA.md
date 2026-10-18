# Ajustes v2.17 — Música tema do menu

## Faixa utilizada
- Fonte: arquivo instrumental fornecido no chat.
- Trecho: **00:41 até 01:33**.
- Duração do loop: aproximadamente **52 s**.
- Fade-in aplicado nos primeiros **2,2 s**.
- Fade-out aplicado nos últimos **3,2 s**.

## Comportamento
- A trilha tenta iniciar automaticamente ao abrir o jogo.
- Volume do tema: `0.075`, abaixo do preview das músicas (`0.22`).
- A faixa fica em loop enquanto o jogador permanece no menu sem preview ativo.
- Ao selecionar uma música, a trilha de menu para imediatamente e o preview da música selecionada assume o áudio.
- Ao terminar o preview de 10 s, a trilha de menu recomeça desde o início do trecho, mantendo o fade-in.
- Ao iniciar a partida, a trilha de menu é interrompida e zerada.
- Caso o navegador bloqueie autoplay com som, o jogo arma um fallback para iniciar a trilha na primeira interação permitida, sem sobrepor o clique de seleção de música.

## Arquitetura
- URL/volume: `src/config/gameplay.js`
- Controle de áudio: `src/audio/music.js`
- Integração com preview: `src/ui/menu.js`
- Interrupção ao iniciar partida: `src/gameplay/session.js`
- Inicialização: `src/main.js`
- Asset: `public/assets/audio/ui/menu-theme-love-me-again.mp3`
