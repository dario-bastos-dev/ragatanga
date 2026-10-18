# You Dance v2.17 — backgrounds dinâmicos por música

## Alterações
- cada música passa a controlar seu próprio vídeo de background no menu e na partida;
- Ragatanga usa `ragatanga-loop.mp4`;
- Thriller usa `thriller-loop.mp4`;
- Macarena usa `macarena-loop.mp4`;
- YMCA usa `ymca-loop.mp4`;
- as imagens PNG/JPEG originais permanecem como fallback enquanto o vídeo carrega;
- a logo lateral do menu foi removida, mantendo somente a logo no painel de opções;
- durante WASTED, o vídeo de fundo passa para playback rate 0.32, acompanhando o slow motion dos personagens;
- ao sair do WASTED, o vídeo retorna para velocidade 1.0;
- o personagem do menu só é exibido quando a animação Idle estiver realmente disponível, evitando o frame congelado da coreografia ao retornar de uma partida;
- a ação Idle é reiniciada explicitamente e colocada em loop ao montar o personagem do menu.

## Arquivos alterados
- `index.html`
- `src/config/songs.js`
- `src/config/gameplay.js`
- `src/scene/stage.js`
- `src/ui/menu.js`
- `src/gameplay/session.js`

## Novos assets
- `public/assets/backgrounds/videos/ragatanga-loop.mp4`
- `public/assets/backgrounds/videos/thriller-loop.mp4`
- `public/assets/backgrounds/videos/macarena-loop.mp4`
- `public/assets/backgrounds/videos/ymca-loop.mp4`

## Validação
- `node --check` nos módulos alterados ✅
- `node scripts/validate-modular.mjs` ✅
