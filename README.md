# You Dance — Projeto v2.17 PORTÁTIL


## Ajustes de interação da v2.17

- MISS em Ragatanga, Macarena e YMCA agora troca a coreografia pela animação de espera do menu, retornando à dança no próximo acerto.
- O texto **YOU DANCE!** permanece visível durante toda a celebração final de 7 segundos.
- A celebração final ganhou áudio de plateia em volume reduzido, mixado ao som de vitória.
- O menu principal recebeu efeitos sonoros separados para seleção/opções, início da dança e pause durante a partida.

## Objetivo da v2.17

A v2.17 é a **refatoração modular da v2.16**. O objetivo desta versão não é alterar o layout, as mecânicas ou os assets aprovados, e sim reorganizar o código para ficar compatível com a arquitetura do repositório principal antes da abertura do Pull Request.

### Garantias de compatibilidade

- `index.html`, `src/style.css` e todos os arquivos de `public/` foram preservados byte a byte em relação à v2.16.
- Os beatmaps e o pipeline `src/dances/` também foram preservados.
- Todas as 112 funções existentes no antigo `src/main.js` continuam presentes, agora distribuídas por domínio.
- `src/main.js` passou de ~165 KB para menos de 1 KB e agora funciona apenas como orquestrador.

## Arquitetura modular

```text
src/
├── main.js                     inicialização/orquestração
├── config/
│   ├── songs.js                músicas e beatmaps
│   ├── difficulties.js         dificuldades e limites de erro
│   ├── gameplay.js             inputs, timings, URLs e regras
│   └── stage-looks.js          iluminação/ambientação por música
├── core/
│   ├── state.js                estado compartilhado da sessão
│   ├── utils.js                utilitários
│   └── leaderboard.js          persistência/ordenação do ranking
├── audio/
│   └── music.js                efeitos e seek de áudio
├── scene/
│   ├── stage.js                Three.js, cenário, luzes e render
│   ├── characters.js           personagens e retarget de animações
│   ├── dancers.js              relógio/execução das coreografias
│   └── thriller-skin.js        pipeline específico da skin do Michael
├── gameplay/
│   ├── chart.js                geração de chart/jogadores
│   ├── input.js                teclado
│   ├── judge.js                acerto, erro e limites
│   └── session.js              ciclo da partida, pause e derrota
├── ui/
│   ├── menu.js                 menu e preview
│   ├── controls.js             botões de navegação
│   ├── hud.js                  feedback/performance
│   ├── results.js              YOU DANCE e resultado
│   └── leaderboard.js          interface do ranking
├── dances/                     clips packed/retarget
└── beatmaps/                   beatmaps
```

O estado mutável compartilhado fica centralizado em `src/core/state.js`. Esta camada existe para preservar integralmente o comportamento da v2.16 durante a divisão por domínios; nenhuma regra de gameplay deve ser duplicada entre UI, cena e sessão.

## Funcionalidades preservadas da v2.16

- Menu You Dance com Liquid Glass/neon.
- Preview musical/coreográfico de 10 segundos.
- Idle com transição suave para/de preview.
- Dificuldade padrão Fácil e sistema de estrelas.
- 1P/2P e ordem P2 `← ↑ ↓ →`.
- Pré-partida `3, 2, 1, DANCE!` e animações de preparação.
- Pause por botão/Esc.
- Limites de erros consecutivos por dificuldade.
- Barra de performance e tremor em estado crítico.
- Seis efeitos de MISS.
- Derrota por excesso de erros e animações de derrota/vitória em multiplayer.
- Cenários, iluminação e sombras por música.
- Skins específicas da fase Thriller.
- Final `YOU DANCE!` com raio, impacto, tremor e áudio de 7 segundos.
- Tela final de vitória e ranking local.
- Execução portátil pelo `ABRIR-JOGO.bat`.

## Validação estrutural

Execute:

```bash
npm run check:architecture
```

O verificador confirma a presença dos módulos esperados, garante que `src/main.js` não voltou a concentrar implementação e valida a versão `2.17.0`.

## Como abrir sem npm

1. Extraia o ZIP inteiro.
2. Execute `ABRIR-JOGO.bat`.
3. Mantenha a janela do servidor portátil aberta enquanto joga.

## Desenvolvimento com Node.js

```bash
npm install
npm run dev
```

## Ponto conhecido para QA

A skin do Michael em Thriller continua usando a implementação visual escolhida na base v2.16/v2.10. A refatoração modular **não altera o auto-rig**, para não introduzir regressão visual antes do PR. A deformação histórica dos braços permanece como item separado de QA/evolução.

---

## Histórico técnico anterior

# Ragatanga — Rhythm MVP v2.2 portátil


## Base do projeto

Esta versão mantém a **Ragatanga-Projeto-v1.6** como base e incorpora as evoluções das versões 1.7 e 1.8 sem remover as funcionalidades anteriores.

Mantido da v1.6:

- pausa por botão e tecla `Esc`, com Continuar/Voltar ao menu;
- mensagens de acerto/erro em português;
- seis efeitos de erro escolhidos aleatoriamente;
- backgrounds e iluminação específicos por música;
- coreografias/beatmaps atuais e comportamento de P1/P2 da v1.6.

Recuperado da versão anterior:

- ranking local: Top 10 pontuações individuais das últimas 10 partidas;
- persistência do ranking via `localStorage`;
- acesso ao ranking pelo menu e pela tela de resultado;
- erro de carregamento do personagem permanece visível e mantém os botões de jogo desabilitados;
- a 5ª pista é ativada pela flag `special` da dificuldade, sem depender do nome `extreme`;
- textos de penalidade usam `MISS_PENALTY` e o especial do P2 identifica corretamente `Enter`;
- menu inicial com rolagem em telas menores.

## Rodar no Windows sem instalar nada

1. Extraia o ZIP.
2. Dê dois cliques em `ABRIR-JOGO.bat`.
3. Mantenha a janela do servidor aberta enquanto joga.

O modo via npm continua disponível apenas para desenvolvimento, caso Node.js esteja instalado.

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


## Atualizações v1.7

- Corrige a transição do pré-roll para o áudio, evitando o recuo da primeira nota.
- Adiciona limite de erros seguidos: Fácil 10, Normal 15, Difícil 20 e Extremo 25.
- Acertos zeram a sequência de erros.
- Adiciona derrota automática, interrupção da música e animação `Dying.fbx`.
- Adiciona tela de derrota com **Tentar novamente** e **Voltar ao menu**.
- Em 2 jogadores, derrotas por limite usam menos erros totais como primeiro critério de vitória e pontuação como desempate.

## Atualizações v1.8

- Nova abertura de partida com contagem **3 → 2 → 1 → DANCE!** e leve escurecimento da tela.
- Durante a contagem, as notas já entram na pista mais devagar, sem alcançar a zona de hit antes do início real.
- P1 usa `Shooting Arrow.fbx` como animação rápida de pré-partida.
- P2 usa `Punching Bag.fbx` como animação rápida de pré-partida.
- As animações de pré-partida são sincronizadas para terminar exatamente no **DANCE!**.
- Ao iniciar a música, a coreografia da fase começa imediatamente.
- Ordem visual e funcional do P2 alterada para **← ↑ ↓ →**.
- Mantido o launcher portátil por `ABRIR-JOGO.bat`, sem necessidade de npm no computador do jogador.
- `Dying.fbx`, `Shooting Arrow.fbx`, `Punching Bag.fbx` e `Laughing.fbx` passam por retarget de esqueleto: o jogo preserva a rest pose/escala do personagem e transfere apenas rotações e movimento proporcional do quadril, evitando deformações do rig.



## v2.0 — Barra de Performance
- Medidor individual abaixo das teclas para P1 e P2.
- Orientação visual: **vermelho à esquerda, amarelo no centro e verde à direita**.
- A seta começa à direita no verde e caminha para a esquerda conforme os erros consecutivos aumentam.
- Faixas proporcionais ao limite da dificuldade.
- No Fácil (limite 10): 0–3 verde, 4–6 amarelo e 7–10 vermelho.
- Um acerto zera a sequência de erros e retorna o indicador para a direita, na zona verde.


## v2.0 — Performance crítica e animações multiplayer

- A barra e o indicador tremem quando os erros consecutivos chegam a 80% do limite da dificuldade.
- P2 usa `Punching Bag.fbx` como animação de pré-partida.
- Em partidas de 2 jogadores encerradas pelo limite de erros, o vencedor executa `Laughing.fbx` enquanto o perdedor executa `Dying.fbx`.
- A animação de vitória não é executada no encerramento normal da música.


## v2.1 — celebração de partida concluída

- Ao concluir a música normalmente, aparece **YOU DANCE!** no centro da tela por alguns segundos.
- Durante a comemoração, cenário/HUD e o próprio texto recebem um tremor forte de euforia.
- P1 comemora com `Bboy Hip Hop Move.fbx`.
- P2 comemora com `Hip Hop Dancing.fbx`.
- Em 1 jogador, apenas P1 comemora. Em 2 jogadores, os dois personagens comemoram simultaneamente antes do placar final.
- A celebração **não** acontece quando a partida termina pelo limite de erros; nesse caso permanecem `Dying.fbx` e, no multiplayer, `Laughing.fbx`.
- As novas animações usam o mesmo retarget seguro dos demais FBX Mixamo.


## v2.2 — skins exclusivas da fase Thriller

- Introduziu o suporte a personagens visuais exclusivos da fase Thriller, com retarget das coreografias e iluminação própria.
- A configuração de P1 dessa versão foi substituída na v2.3.


## v2.3 — Michael Jackson no P1 de Thriller

- O antigo `ZombieMan.fbx` foi removido do projeto.
- **P1 em Thriller:** modelo `MJ_THRILLER.fbx` extraído do pacote `michael-jackson-thriller.zip`.
- **P2 em Thriller:** continua usando `ZombieGirl.fbx`.
- O modelo Michael enviado é uma malha estática, sem armature. Para não alterar a mecânica, a v2.3 cria automaticamente uma versão skinned sobre o mesmo rig Mixamo do personagem padrão e transfere os pesos de pele por proximidade.
- Com isso, a skin de Michael usa a mesma coreografia `thriller.json`, além de pré-partida, `Dying`, `Laughing` e `YOU DANCE!`, sem trocar beatmap, teclas ou regras.
- A textura original do pacote foi mantida e o carregador normaliza o caminho `.fbm` exportado pelo Blender para funcionar no navegador/servidor portátil.
- O carregamento de uma skin deixou de bloquear a fase: se algum asset visual falhar, o jogo usa o personagem padrão como fallback e mantém a partida disponível.
- Iluminação, sombras e tratamento de materiais específicos de Thriller continuam ativos para integrar Michael e ZombieGirl ao cenário.


## v2.4 — correção visual e auto-rig do Michael em Thriller

- P1 de Thriller continua usando `MJ_THRILLER.fbx`; P2 continua usando `ZombieGirl.fbx`. Nenhuma outra fase foi alterada.
- Corrigida a transparência do Michael: o FBX original ligava a textura de cor ao `TransparencyFactor`; o jogo agora preserva o RGB da textura, força opacidade total e mantém depth test/write, luzes e sombras.
- A cor base do material do Michael passa a branco antes da iluminação, evitando que o vermelho da jaqueta seja dessaturado pelo diffuse cinza importado.
- A tintura ambiental de Thriller foi reduzida somente no material do Michael, preservando melhor vermelho, azul, pele e cabelo, sem remover key/fill/rim/front lights, fog ou sombras de contato.
- O auto-rig foi refeito para braços/pernas: em vez de transferir pesos apenas por proximidade da malha Samba, a skin usa segmentos anatômicos do próprio esqueleto Mixamo (ombro → braço → antebraço → mão; quadril → perna → pé; tronco/pescoço/cabeça).
- O novo mapeamento elimina influências cruzadas entre lado esquerdo/direito e descarta micro-influências distantes, reduzindo os vértices/triângulos esticados vistos nos braços durante a dança.
- O sistema anterior de pesos por proximidade permanece como fallback de segurança caso um rig futuro não tenha todos os ossos Mixamo esperados.


## v2.5 — Michael Thriller: proporções e suavização corrigidas

- P1 da fase Thriller continua usando Michael Jackson; P2 continua ZombieGirl.
- O rig do Michael agora é ajustado às proporções reais da própria malha antes do bind.
- Ombros, braços, antebraços e mãos passam a usar o alcance original do modelo, evitando braços curtos/encolhidos.
- A geometria do Michael não é remodelada para caber no personagem Samba.
- Normais são suavizadas entre vértices duplicados sem destruir UV/texturas.
- Vertex colors e flat shading do FBX são desativados no Michael para remover o aspecto de triângulos/facetas brancas.
- Material continua 100% opaco, com textura original, iluminação, sombras e ambientação do Thriller.
- ZombieGirl e mecânicas da fase não foram alteradas.


## v2.13 — Menu You Dance / Liquid Glass
- Novo menu inicial inspirado no layout enviado pelo usuário.
- Logotipos You Dance integrados (principal, lateral e ícone).
- Preview do personagem P1 à esquerda com prévia de 10 segundos ao selecionar música.
- Dificuldade padrão alterada para Fácil.
- Botão INICIAR liberado somente após seleção de música.
- Nova tela de vitória com identidade neon + liquid glass.
- Overlay YOU DANCE! com raio, tremor e impacto visual antes do resultado final.


## v2.15 — Preview, vitória e responsividade
- Preview real de 10 segundos: ao escolher uma música, o P1 exclusivo daquela fase é carregado no menu, a música toca em volume reduzido e a coreografia real é executada durante 10 segundos.
- Depois da prévia, o personagem retorna à pose/idle de espera; clicar novamente na música repete a prévia.
- Dificuldade padrão permanece em Fácil e INICIAR DANÇA só habilita após selecionar uma música e seus assets estarem prontos.
- Tela de vitória redesenhada: personagem vencedor continua comemorando em WebGL à esquerda e painel Liquid Glass fica à direita com pontuação, precisão, combo e classificação.
- Em multiplayer, o vencedor permanece em destaque; empate pode exibir os dois personagens.
- O impacto YOU DANCE! agora começa com um raio central, flash, shockwave e tremor forte antes da entrada da marca/texto e da tela de resultado.
- Menu, cards, botões e resultados ganharam hovers, reflexos de vidro, gradientes neon e animações sutis.
- Layout responsivo refinado para 1366/1440, telas com pouca altura, tablets e telas menores.
- Mantido o carregamento HTTPS do Three.js e do Samba Dancing, igual à base portátil v2.10 já validada no PC.


## v2.16 — Correção do overlay de vitória
- Corrigido painel de vitória aparecendo ao abrir o jogo.
- Resultado permanece oculto até a conclusão real de uma partida.


## v2.17 — Arquitetura modular

A v2.17 preserva o comportamento/visual da v2.16, mas redistribui a lógica por domínio para alinhar o projeto ao repositório principal:

```text
src/
├── main.js                  orquestrador
├── config/                  músicas, dificuldades, gameplay e looks
├── core/                    estado compartilhado, utilitários e ranking
├── audio/                   efeitos e controle auxiliar de áudio
├── scene/                   palco, personagens, dança e skin Thriller
├── gameplay/                chart, input, julgamento e sessão
├── ui/                      menu, HUD, resultados e controles
├── dances/                  pipeline de clips/retarget
└── beatmaps/                wrappers/beatmaps
```

`src/main.js` não concentra mais a implementação do jogo; apenas inicializa e conecta os módulos. O estado mutável compartilhado fica centralizado em `src/core/state.js`, evitando que módulos de UI, cena e gameplay criem cópias divergentes do estado durante esta etapa de compatibilidade com a v2.16.
