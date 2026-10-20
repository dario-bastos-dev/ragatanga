# Abertura cinematográfica You Dance

## Composição e transição

O cenário continua sendo `public/assets/backgrounds/menu-club.png`, em
`center/cover`, com o mesmo enquadramento do menu. Não há imagem nova nem
substituição dos personagens. A logo é a mesma imagem horizontal usada no menu.

As quatro membranas usam recortes CSS da própria textura original, com máscara
suave e escala máxima de aproximadamente 1,8% na música e reforço breve de 2,5%
no Enter. O cenário inteiro permanece imóvel. As coordenadas são medidas na
imagem 1672 × 941; escala e recorte central são recalculados ao redimensionar.

Refletores, reflexos no piso, partículas e globo são camadas independentes.
O globo simula movimento através de reflexos; sua imagem original não gira.
Os anéis têm arcos SVG percorrendo o contorno em sentidos opostos, sem preencher
a área interior com manchas claras.

Sequência após Enter:

| Tempo | Comportamento |
| --- | --- |
| 0–300 ms | Reforço das membranas e luz, mensagem desaparece |
| 300–900 ms | Logo reduz e viaja até o retângulo real da marca do menu |
| 900–1400 ms | Fundo da abertura dissolve; painel, cards, dificuldades, modos e início aparecem |
| Final | Logo original assume a posição, controles liberados, entrada inicial e prévia de Thriller |

A marca do menu permanece invisível durante o movimento. Os estados temporários
de revelação são removidos ao concluir; os estilos finais do menu aprovado não
foram alterados. Há proteção contra Enter repetido, timer de segurança,
recalculo da trajetória no resize e limpeza dos listeners/loop de efeitos.
Movimento reduzido usa dissolução de 180 ms, sem voo da logo, pulsação ou flashes.

## Áudio

Não existe uma segunda reprodução da trilha. Depois de uma interação válida,
um único `AudioContext` em execução recebe o elemento ambiente já existente:

```text
menuThemeSound → MediaElementAudioSourceNode → destination
                                            → AnalyserNode
```

O ramo do analisador não cria outra saída audível. A análise dos graves de
40–190 Hz controla as propriedades CSS, com suavização e atualização limitada a
aproximadamente 30 Hz. Nenhum novo caminho de áudio é criado se o contexto não
puder ser retomado. Caso falhe apenas o analisador, a rota audível direta é
preservada. O contexto não é fechado ao terminar a abertura, pois a trilha
continua sendo usada no menu e nos resultados.

Quando a análise não está disponível, os mesmos efeitos CSS recebem um ritmo
aproximado de 124 BPM referenciado ao `currentTime` da trilha. Esse valor não é
uma medição automática de BPM. Sem reprodução autorizada ou com volume zero,
as caixas não pulsam continuamente. Enter ainda produz o impacto visual previsto.

## Arquivos desta etapa

- `index.html`: cenário, camadas, membranas e logo horizontal.
- `src/style.css`: remove o fundo geométrico e os estilos antigos da abertura.
- `src/ui/intro.css`: novo; composição e fases visuais isoladas.
- `src/ui/intro.js`: sequência, trajetória medida e liberação do menu.
- `src/ui/intro-show.js`: novo; projeção do cenário e ciclo dos efeitos.
- `src/audio/intro-reactivity.js`: novo; grafo único, análise e tratamento de falhas.
- `src/audio/music.js`: acesso à trilha existente e retomada do contexto.
- `package.json`: inclui testes de segurança do áudio em `npm test`.
- `scripts/test-intro.mjs`: testes de entrada, fallback, resize e geometria.
- `scripts/test-intro-audio.mjs`: novo; testa rota única e falhas do contexto/analisador.
- `scripts/test-menu-browser.mjs`: inclui capturas e verificações cinematográficas.
- `scripts/validate-modular.mjs`: inclui os dois módulos novos.
- Documentação e artefatos em `output/intro-validation/`.

O visual final do menu, modelos, animações, câmera, beatmaps, dificuldades,
julgamento, ranking e comandos não receberam alterações nesta etapa.

## Validação executada

- `npm test`: oito testes aprovados.
- `npm run check:architecture`: 27 módulos; `main.js` permanece com 1009 bytes.
- `npm run build`: aprovado.
- Chrome headless com WebGL em software: variação dos graves reais confirmada;
  projeção das membranas em 1600 × 900, 1366 × 768 e 390 × 844; Enter único,
  logo alinhada, sem duplicação; resize durante a transição; movimento reduzido
  e navegador sem Web Audio.
- Regressão real no navegador: quatro músicas e prévias, duração de 10 segundos,
  personagens, dificuldades, ranking, volumes, comandos, ambos os modos,
  câmera original, pausa, repetição e retornos por pré-roll, derrota e resultados.

Para repetir a rodada completa com capturas, no PowerShell:

```powershell
$env:YOU_DANCE_CINEMA = '1'
npm run test:menu
```

As imagens `transition-150ms`, `transition-600ms`, `transition-1100ms` e
`transition-1390ms` usam as animações reais pausadas nos instantes indicados para
permitir comparação visual reproduzível. Enter real e retorno ao menu são
exercitados separadamente pela regressão.

Artefatos: `output/intro-validation/report.json` registra amostras de graves,
posições da logo e estado da análise. `output/menu-validation/report.json`
registra a regressão. As capturas foram inspecionadas; um preenchimento claro
excessivo nos anéis foi substituído por arcos de luz, e as origens dos feixes
foram ajustadas aos refletores da imagem.

## Limitações e conferência manual

Membranas e globo continuam sendo simulações 2D sobre um cenário estático. Em
retrato, parte das caixas fica fora da tela pelo mesmo recorte `cover` do menu;
as camadas são recortadas junto com a imagem.

Autoplay continua dependendo do navegador: antes da primeira interação o áudio
pode estar bloqueado. A sincronização real foi comprovada no Chrome; Safari,
Firefox, retomada após troca de dispositivo de áudio e percepção dos graves em
alto-falantes físicos precisam de conferência manual. O teste headless não
comprova FPS em GPU física nem substitui partidas completas jogadas por uma pessoa.

O build mantém os avisos anteriores de caminho de `Pricedown-Bl.otf` e bundle
acima de 500 kB. Não houve falha de build ou erro de JavaScript nas rodadas aprovadas.
