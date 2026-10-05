# Ragatanga — Rhythm MVP 1.2

## Rodar

```bash
npm install
npm run dev
```

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

`W A S D X`

P2:

`↑ ← ↓ → ENTER`

O quinto receptor fica na mesma linha dos demais.
