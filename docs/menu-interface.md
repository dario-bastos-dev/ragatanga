# Menu You Dance — feature/nova-interface

## Implementação

Menu em duas regiões (40% / 60%), com cenário exclusivo, logo existente,
personagens reais do projeto e quatro capas individuais recriadas a partir de
`menu-dance.jpeg`. A referência inteira não é usada como fundo nem como controle.
O painel em 1600 × 900 começa em aproximadamente (627, 30) e tem largura 940 px.

- Músicas: Thriller, Ragatanga, Macarena e YMCA; setas usam a seleção real.
- Jogadores: instruções dos comandos; a seleção de modo abaixo é compartilhada
  entre todas as abas.
- Configurações: volumes reais de ambiente e prévia, mantidos durante a sessão.
- Extras: ranking existente e guia de comandos.
- Dificuldades e modo permanecem disponíveis nas quatro abas.
- A seleção inicial é Thriller; a prévia começa depois da abertura e do
  carregamento dos recursos, dura 10 segundos e volta ao idle existente.
- Tema e prévia usam reprodução exclusiva. Bloqueio de autoplay apresenta a
  instrução para clicar na música; não impede a navegação.
- Retorno ao menu limpa os estados transitórios sem recarregar a página,
  preservando música, dificuldade, modo e volumes. Gerações de sessão cancelam
  tarefas de início/pré-roll pendentes.
- A câmera da partida permanece intacta. Em telas estreitas há uma câmera
  separada somente para a região de prévia do menu.

## Arquivos

Interface e integração:

- `index.html`
- `src/main.js`
- `src/ui/menu.js`
- `src/ui/intro.js` (abertura anterior, com chamada de entrada inicial)
- `src/ui/menu-navigation.js` (novo)
- `src/ui/menu.css` (novo; estilos restritos ao menu)
- `src/core/state.js`
- `src/config/songs.js`
- `src/audio/music.js`
- `src/gameplay/session.js`
- `src/scene/stage.js`

Validação:

- `package.json` (scripts `test` e `test:menu`, sem novas dependências)
- `scripts/validate-modular.mjs`
- `scripts/test-intro.mjs` (criado na etapa da abertura)
- `scripts/test-menu-browser.mjs` (novo)

Recursos:

- `public/assets/backgrounds/menu-club.png`
- `public/assets/covers/thriller.png`
- `public/assets/covers/ragatanga.png`
- `public/assets/covers/macarena.png`
- `public/assets/covers/ymca.png`

Os estilos do menu ficam no arquivo separado; a abertura cinematográfica usa
`src/ui/intro.css` e está documentada em `docs/intro-cinematic.md`. Nenhum modelo, textura de personagem, áudio,
beatmap, regra de dificuldade ou módulo de julgamento foi substituído.

## Reprodução dos testes

```sh
npm test
npm run check:architecture
npm run build
npm run test:menu
```

O teste de navegador usa Node 22+ com WebSocket nativo e o Chrome instalado no caminho
padrão do Windows. É possível informar outro executável:

```sh
node scripts/test-menu-browser.mjs "caminho/para/chrome.exe"
```

O teste usa servidor nas portas 5178/9338 e perfil temporário próprio, sem tocar
no ranking do perfil normal do usuário. É necessário acesso ao modelo base FBX
remoto já utilizado pelo projeto. Não instala dependências.

Capturas e relatórios ficam em `output/menu-validation/`. O `report.json`
registra a rodada completa; `layout-report.json` registra a conferência adicional
de desktop, tablet e celular. Os testes verificam abertura, Thriller, ordem e
seleção dos cards, abas, ranking, volumes, exclusão entre tema e prévia, duração
de 10 segundos, personagens e ações das quatro músicas, dificuldades, comandos,
modos, câmera original, pausa, cancelamento do pré-roll e os caminhos de retorno
por derrota e resultados. Também exercitam repetição por derrota e resultados.

Os encerramentos são antecipados pelas funções reais `finish()` e
`endByMistakeLimit()`; não equivalem a jogar todas as músicas até o fim.

## Recursos visuais e limitações

O cenário e as quatro capas foram produzidos com o gerador integrado `image_gen`.
As capas são recriações ilustradas dos temas mostrados na referência, não capas
oficiais dos artistas nem recortes exatos. Prompts: `docs/menu-assets.json`.

A marca horizontal existente foi mantida: ela tem um globo e difere da logo com
coroa da referência. Uma versão oficial dessa marca com coroa não foi fornecida.
As animações e os personagens preservados também diferem do manequim do mockup.

O build aponta dois avisos: a referência antiga de `Pricedown-Bl.otf` e o tamanho
do bundle acima de 500 kB. Não há falha de build.

Conferência manual recomendada: percepção de áudio, sincronismo jogando músicas
inteiras, desempenho em GPU física e navegadores Firefox/Safari. A automação foi
executada no Chrome headless com WebGL em software; as capturas não comprovam
desempenho em outros dispositivos.
