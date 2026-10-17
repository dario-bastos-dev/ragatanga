# Arquitetura — You Dance v2.17

## Objetivo

Separar responsabilidades sem alterar o comportamento observado na v2.16.

## Fluxo de inicialização

`src/main.js` importa os módulos e executa somente:

1. inicialização do menu;
2. inicialização das dificuldades;
3. inicialização do ranking;
4. bind dos controles;
5. bind do teclado;
6. inicialização da cena Three.js.

## Domínios

### `config/`
Somente dados estáticos e regras configuráveis. Não manipula DOM nem Three.js.

### `core/`
Estado compartilhado, utilitários e persistência do ranking. `state.js` é a única camada de compatibilidade compartilhada entre os domínios nesta refatoração.

### `audio/`
Efeitos de MISS, áudio de vitória e helpers de seek.

### `scene/`
Responsável por Three.js, personagens, iluminação, retarget e animações. O auto-rig específico do Michael foi isolado em `thriller-skin.js` por ser uma preocupação própria e volumosa.

### `gameplay/`
Chart, jogadores, inputs, julgamento, miss streak, performance, ciclo da partida, pausa e derrota.

### `ui/`
Menu, controles, HUD, ranking e resultado. UI não contém configuração de músicas/dificuldades.

## Dependências

A v2.17 evita duplicação de estado. O estado mutável compartilhado é inicializado em `core/state.js` e os módulos de domínio operam sobre a mesma sessão. Essa escolha mantém compatibilidade 1:1 com a v2.16 e prepara o código para o PR, onde a camada pode ser gradualmente convertida para imports/exportações explícitas sem reescrever regras de gameplay.

## Regra do orquestrador

`src/main.js` deve permanecer pequeno. O script `scripts/validate-modular.mjs` falha se ele voltar a conter implementações como auto-rig, update do jogo ou renderização de resultados.

## Migração para o PR

Ao integrar no repositório `dario-bastos-dev/ragatanga`:

- preservar os testes Vitest existentes do `main`;
- portar estes módulos sobre os módulos equivalentes do repositório, sem substituir testes;
- revisar licenças dos FBX antes de versionar assets;
- manter o pipeline packed/JSON quando o asset for proveniente de Mixamo;
- validar a skin Michael separadamente.
