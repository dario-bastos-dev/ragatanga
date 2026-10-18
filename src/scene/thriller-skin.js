import '../core/state.js';

function hasMixamoRig(root){

  let found = false;

  root?.traverse(object => {
    if(
      object.isBone &&
      object.name === 'mixamorigHips'
    ){
      found = true;
    }
  });

  return found;

}

function buildAutoRiggedThrillerSkin(
  staticSource,
  rigTemplate
){

  const rigRoot =
    SkeletonUtils.clone(rigTemplate);

  rigRoot.position.set(0, 0, 0);
  rigRoot.rotation.set(0, 0, 0);
  rigRoot.scale.set(1, 1, 1);
  rigRoot.updateMatrixWorld(true);

  const referenceMeshes = [];

  rigRoot.traverse(object => {
    if(
      object.isSkinnedMesh &&
      object.geometry?.getAttribute('position') &&
      object.geometry?.getAttribute('skinIndex') &&
      object.geometry?.getAttribute('skinWeight') &&
      object.skeleton?.bones?.length
    ){
      referenceMeshes.push(object);
    }
  });

  if(!referenceMeshes.length){
    throw new Error(
      'O personagem base não possui uma malha skinned de referência.'
    );
  }

  const canonicalSkeleton =
    referenceMeshes[0].skeleton;

  const canonicalBones =
    canonicalSkeleton.bones;

  const canonicalIndexByName =
    new Map();

  canonicalBones.forEach((bone, index) => {
    if(!canonicalIndexByName.has(bone.name)){
      canonicalIndexByName.set(bone.name, index);
    }
  });

  if(!canonicalIndexByName.has('mixamorigHips')){
    throw new Error(
      'O rig base não possui mixamorigHips.'
    );
  }

  const rigBox =
    new THREE.Box3();

  for(const mesh of referenceMeshes){
    rigBox.union(
      new THREE.Box3().setFromObject(mesh)
    );
  }

  staticSource.updateMatrixWorld(true);

  const sourceBox =
    new THREE.Box3()
      .setFromObject(staticSource);

  const rigSize =
    new THREE.Vector3();

  const sourceSize =
    new THREE.Vector3();

  const rigCenter =
    new THREE.Vector3();

  const sourceCenter =
    new THREE.Vector3();

  rigBox.getSize(rigSize);
  sourceBox.getSize(sourceSize);
  rigBox.getCenter(rigCenter);
  sourceBox.getCenter(sourceCenter);

  if(
    !Number.isFinite(sourceSize.y) ||
    sourceSize.y <= 0.0001 ||
    !Number.isFinite(rigSize.y) ||
    rigSize.y <= 0.0001
  ){
    throw new Error(
      'Não foi possível calcular as proporções da skin Michael.'
    );
  }

  const fitScale =
    rigSize.y / sourceSize.y;

  const fitMatrix =
    new THREE.Matrix4()
      .makeTranslation(
        rigCenter.x,
        rigBox.min.y,
        rigCenter.z
      )
      .multiply(
        new THREE.Matrix4()
          .makeScale(
            fitScale,
            fitScale,
            fitScale
          )
      )
      .multiply(
        new THREE.Matrix4()
          .makeTranslation(
            -sourceCenter.x,
            -sourceBox.min.y,
            -sourceCenter.z
          )
      );

  /*
    Amostras da malha original já rigada. Guardamos posição + pesos e
    depois usamos uma grade espacial para achar rapidamente os vizinhos
    de cada vértice da nova skin.
  */
  const rigRootInverse =
    rigRoot.matrixWorld
      .clone()
      .invert();

  const samples = [];

  const grid =
    new Map();

  const cellSize =
    Math.max(
      rigSize.y / 30,
      0.0001
    );

  const cellKey = (
    x,
    y,
    z
  ) =>
    `${x}|${y}|${z}`;

  /*
    Amostras do corpo de referência (posição + pesos). São recalculadas
    depois que o rig é posado na A-pose do Michael, para que os pesos
    transferidos venham de um corpo na MESMA pose da malha.
  */
  const collectReferenceSamples = () => {

    samples.length = 0;
    grid.clear();


    for(const mesh of referenceMeshes){

      const positions =
        mesh.geometry.getAttribute('position');

      const skinIndex =
        mesh.geometry.getAttribute('skinIndex');

      const skinWeight =
        mesh.geometry.getAttribute('skinWeight');

      if(
        !positions ||
        !skinIndex ||
        !skinWeight
      ){
        continue;
      }

      const sourceBones =
        mesh.skeleton.bones;

      const point =
        new THREE.Vector3();

      for(
        let vertex = 0;
        vertex < positions.count;
        vertex++
      ){

        /* Posição já deformada: acompanha o rig quando ele é posado. */
        mesh
          .getVertexPosition(
            vertex,
            point
          )
          .applyMatrix4(mesh.matrixWorld)
          .applyMatrix4(rigRootInverse);

        const sourceIndices = [
          skinIndex.getX(vertex),
          skinIndex.getY(vertex),
          skinIndex.getZ(vertex),
          skinIndex.getW(vertex)
        ];

        const sourceWeights = [
          skinWeight.getX(vertex),
          skinWeight.getY(vertex),
          skinWeight.getZ(vertex),
          skinWeight.getW(vertex)
        ];

        const indices = [];
        const weights = [];

        for(let slot = 0; slot < 4; slot++){

          const weight =
            sourceWeights[slot] || 0;

          if(weight <= 0){
            continue;
          }

          const sourceBone =
            sourceBones[sourceIndices[slot]];

          if(!sourceBone){
            continue;
          }

          const mappedIndex =
            canonicalIndexByName.get(
              sourceBone.name
            );

          if(mappedIndex == null){
            continue;
          }

          indices.push(mappedIndex);
          weights.push(weight);

        }

        if(indices.length){
          samples.push({
            x: point.x,
            y: point.y,
            z: point.z,
            indices,
            weights
          });
        }

      }

    }

    if(!samples.length){
      throw new Error(
        'Não foi possível obter pesos de skin do personagem base.'
      );
    }


    for(const sample of samples){

      const cx =
        Math.floor(sample.x / cellSize);

      const cy =
        Math.floor(sample.y / cellSize);

      const cz =
        Math.floor(sample.z / cellSize);

      const key =
        cellKey(cx, cy, cz);

      let bucket =
        grid.get(key);

      if(!bucket){
        bucket = [];
        grid.set(key, bucket);
      }

      bucket.push(sample);

    }

  };

  collectReferenceSamples();

  const hipsIndex =
    canonicalIndexByName.get(
      'mixamorigHips'
    );

  const nearestWeights = point => {

    const cx =
      Math.floor(point.x / cellSize);

    const cy =
      Math.floor(point.y / cellSize);

    const cz =
      Math.floor(point.z / cellSize);

    const nearest = [];

    const consider = sample => {

      const dx = point.x - sample.x;
      const dy = point.y - sample.y;
      const dz = point.z - sample.z;

      const distanceSq =
        dx * dx +
        dy * dy +
        dz * dz;

      let insertAt =
        nearest.length;

      while(
        insertAt > 0 &&
        nearest[insertAt - 1].distanceSq > distanceSq
      ){
        insertAt--;
      }

      nearest.splice(
        insertAt,
        0,
        {
          sample,
          distanceSq
        }
      );

      if(nearest.length > 6){
        nearest.pop();
      }

    };

    for(
      let radius = 0;
      radius <= 6;
      radius++
    ){

      for(
        let dx = -radius;
        dx <= radius;
        dx++
      ){
        for(
          let dy = -radius;
          dy <= radius;
          dy++
        ){
          for(
            let dz = -radius;
            dz <= radius;
            dz++
          ){

            if(
              radius > 0 &&
              Math.max(
                Math.abs(dx),
                Math.abs(dy),
                Math.abs(dz)
              ) !== radius
            ){
              continue;
            }

            const bucket =
              grid.get(
                cellKey(
                  cx + dx,
                  cy + dy,
                  cz + dz
                )
              );

            if(!bucket){
              continue;
            }

            for(const sample of bucket){
              consider(sample);
            }

          }
        }
      }

      if(
        nearest.length >= 6 &&
        radius >= 1
      ){
        break;
      }

    }

    if(!nearest.length){
      return {
        indices: [hipsIndex, 0, 0, 0],
        weights: [1, 0, 0, 0]
      };
    }

    const aggregate =
      new Map();

    for(const item of nearest){

      const proximity =
        1 /
        Math.max(
          Math.sqrt(item.distanceSq),
          cellSize * 0.08
        );

      item.sample.indices.forEach(
        (boneIndex, slot) => {
          const weighted =
            (item.sample.weights[slot] || 0) *
            proximity;

          aggregate.set(
            boneIndex,
            (aggregate.get(boneIndex) || 0) +
            weighted
          );
        }
      );

    }

    const strongest =
      [...aggregate.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const total =
      strongest.reduce(
        (sum, [, weight]) => sum + weight,
        0
      ) || 1;

    const indices = [0, 0, 0, 0];
    const weights = [0, 0, 0, 0];

    strongest.forEach(
      ([boneIndex, weight], slot) => {
        indices[slot] = boneIndex;
        weights[slot] = weight / total;
      }
    );

    return {
      indices,
      weights
    };

  };

  /*
    Auto-rig anatômico do Michael
    -----------------------------
    A primeira versão transferia os pesos apenas pelo vértice mais próximo
    do Samba. Isso funciona bem quando as duas malhas possuem exatamente a
    mesma rest pose, mas o Michael está numa A-pose um pouco diferente. Em
    braços/ombros alguns vértices acabavam recebendo influência do tronco e
    da mão ao mesmo tempo, criando aqueles "braços elásticos".

    Agora usamos os próprios segmentos do esqueleto Mixamo como referência:
    tronco, braços, antebraços, mãos, pernas, pés, pescoço e cabeça. Assim
    todos os vértices de um mesmo membro seguem uma cadeia anatômica coerente.
    A transferência antiga fica somente como fallback caso um rig futuro não
    possua os nomes padrão do Mixamo.
  */
  const boneLocalPosition = name => {

    const index =
      canonicalIndexByName.get(name);

    if(index == null){
      return null;
    }

    const point =
      new THREE.Vector3();

    canonicalBones[index]
      .getWorldPosition(point);

    point.applyMatrix4(
      rigRootInverse
    );

    return point;

  };

  /*
    Ajuste proporcional do rig do Michael
    --------------------------------------
    A malha original já possui as proporções corretas (inclusive o alcance
    dos braços). Portanto, antes de calcular os pesos de skin, alongamos o
    esqueleto Mixamo oculto para coincidir com os braços REAIS do Michael.

    Isso é diferente de escalar/deformar a malha para caber no Samba: a
    geometria permanece exatamente no formato importado e apenas os pivôs do
    rig são reposicionados. Assim o braço não encurta quando a animação gira
    ombro/cotovelo/punho.
  */
  const michaelSurfacePoints = [];
  const michaelPoint = new THREE.Vector3();

  staticSource.traverse(object => {
    if(
      !object.isMesh ||
      !object.geometry?.getAttribute('position')
    ){
      return;
    }

    const positions =
      object.geometry.getAttribute('position');

    /* Limita a amostragem para não pesar a abertura da fase em modelos grandes. */
    const stride =
      Math.max(
        1,
        Math.floor(positions.count / 18000)
      );

    for(
      let vertex = 0;
      vertex < positions.count;
      vertex += stride
    ){
      michaelPoint
        .fromBufferAttribute(positions, vertex)
        .applyMatrix4(object.matrixWorld)
        .applyMatrix4(fitMatrix);

      michaelSurfacePoints.push(
        michaelPoint.clone()
      );
    }
  });

  const michaelHeight = rigSize.y;
  const michaelHalfSpan =
    Math.max(
      sourceSize.x * fitScale * 0.5,
      michaelHeight * 0.20
    );

  const michaelCenterX = rigCenter.x;
  const michaelCenterZ = rigCenter.z;
  const michaelBottomY = rigBox.min.y;

  const getBaseBoneWorld = name => {
    const index = canonicalIndexByName.get(name);
    if(index == null){
      return null;
    }

    return canonicalBones[index]
      .getWorldPosition(new THREE.Vector3())
      .applyMatrix4(rigRootInverse);
  };

  const setBoneRigPosition = (
    name,
    targetRigPoint
  ) => {
    const index = canonicalIndexByName.get(name);
    if(index == null){
      return false;
    }

    const bone = jointNode(canonicalBones[index]);

    /* targetRigPoint está no espaço local de rigRoot. */
    const targetWorld =
      targetRigPoint
        .clone()
        .applyMatrix4(rigRoot.matrixWorld);

    if(bone.parent){
      bone.parent.updateMatrixWorld(true);
      bone.position.copy(
        bone.parent.worldToLocal(
          targetWorld.clone()
        )
      );
    }else{
      bone.position.copy(targetWorld);
    }

    bone.updateMatrixWorld(true);
    return true;
  };

  /*
    O rig base está em T-pose, mas a malha do Michael está em A-pose. As
    animações são deltas relativos à T-pose: se a malha for presa a ossos
    ainda horizontais, cada pose soma os ~36° da A-pose e os braços entram
    no tronco. Por isso giramos a cadeia do braço até a A-pose da malha só
    durante o bind e depois devolvemos as rotações originais (T-pose).
  */
  const restQuaternions =
    new Map();

  /*
    O FBXLoader duplica cada osso Mixamo (nó externo + filho homônimo com
    offset zero). A animação gira o nó externo, então é ele que posamos.
  */
  const jointNode = node => {
    while(node.parent?.name === node.name){
      node = node.parent;
    }
    return node;
  };

  const poseBoneTowards = (
    name,
    childName,
    targetRigPoint
  ) => {
    const index = canonicalIndexByName.get(name);
    const childIndex = canonicalIndexByName.get(childName);

    if(index == null || childIndex == null){
      return false;
    }

    const bone = jointNode(canonicalBones[index]);
    const child = jointNode(canonicalBones[childIndex]);

    let ancestor = child.parent;
    while(ancestor && ancestor !== bone){
      ancestor = ancestor.parent;
    }

    if(!ancestor){
      return setBoneRigPosition(childName, targetRigPoint);
    }

    if(!restQuaternions.has(bone)){
      restQuaternions.set(bone, bone.quaternion.clone());
    }

    bone.updateMatrixWorld(true);

    const pivot =
      bone.getWorldPosition(new THREE.Vector3());

    const targetWorld =
      targetRigPoint
        .clone()
        .applyMatrix4(rigRoot.matrixWorld);

    /* Comprimento do Michael, direção da T-pose original. */
    const length =
      pivot.distanceTo(targetWorld) /
      bone.getWorldScale(new THREE.Vector3()).x;

    if(child.position.lengthSq() > 1e-12){
      child.position.setLength(length);
    }

    bone.updateMatrixWorld(true);

    const current =
      child
        .getWorldPosition(new THREE.Vector3())
        .sub(pivot)
        .normalize();

    const desired =
      targetWorld
        .sub(pivot)
        .normalize();

    const worldDelta =
      new THREE.Quaternion()
        .setFromUnitVectors(current, desired);

    const parentWorld =
      bone.parent
        ? bone.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();

    bone.quaternion.premultiply(
      parentWorld
        .clone()
        .invert()
        .multiply(worldDelta)
        .multiply(parentWorld)
    );

    bone.updateMatrixWorld(true);
    return true;
  };

  const percentile = (
    values,
    amount
  ) => {
    if(!values.length){
      return null;
    }

    const sorted = [...values]
      .sort((a, b) => a - b);

    const index =
      Math.max(
        0,
        Math.min(
          sorted.length - 1,
          Math.round(
            (sorted.length - 1) * amount
          )
        )
      );

    return sorted[index];
  };

  const findHandTarget = sideSign => {
    if(!michaelSurfacePoints.length){
      return null;
    }

    const minUsefulY =
      michaelBottomY +
      michaelHeight * 0.42;

    const maxUsefulY =
      michaelBottomY +
      michaelHeight * 0.84;

    let candidates =
      michaelSurfacePoints.filter(point => {
        const outward =
          sideSign *
          (point.x - michaelCenterX);

        return (
          outward >= michaelHalfSpan * 0.72 &&
          point.y >= minUsefulY &&
          point.y <= maxUsefulY
        );
      });

    if(!candidates.length){
      candidates =
        michaelSurfacePoints.filter(point =>
          sideSign *
            (point.x - michaelCenterX) >=
              michaelHalfSpan * 0.62
        );
    }

    if(!candidates.length){
      return null;
    }

    /*
      A ponta extrema contém dedos isolados. Usamos a região entre 72% e
      96% do alcance lateral para posicionar o punho, evitando colocar o
      osso Hand exatamente na ponta do dedo.
    */
    const outwardValues =
      candidates.map(point =>
        sideSign *
        (point.x - michaelCenterX)
      );

    const outer72 =
      percentile(outwardValues, 0.72) ??
      michaelHalfSpan * 0.78;

    const outer96 =
      percentile(outwardValues, 0.96) ??
      michaelHalfSpan * 0.94;

    const wristBand =
      candidates.filter(point => {
        const outward =
          sideSign *
          (point.x - michaelCenterX);

        return (
          outward >= outer72 &&
          outward <= outer96
        );
      });

    const points =
      wristBand.length
        ? wristBand
        : candidates;

    const y =
      percentile(
        points.map(point => point.y),
        0.50
      );

    const z =
      percentile(
        points.map(point => point.z),
        0.50
      );

    return new THREE.Vector3(
      michaelCenterX +
        sideSign *
        Math.min(
          michaelHalfSpan * 0.91,
          outer96
        ),
      THREE.MathUtils.clamp(
        y ?? (
          michaelBottomY +
          michaelHeight * 0.56
        ),
        michaelBottomY + michaelHeight * 0.48,
        michaelBottomY + michaelHeight * 0.68
      ),
      Number.isFinite(z)
        ? z
        : michaelCenterZ
    );
  };

  /*
    v2.9 — rig dos braços medido NA PRÓPRIA malha do Michael
    ---------------------------------------------------------
    O corpo/roupa do FBX já estão corretos. O defeito das versões anteriores
    vinha de estimar os pivôs do braço a partir do personagem-base. Isso
    colocava o ombro para dentro do tórax e fazia a animação girar o membro
    ao redor de um ponto errado.

    Agora os quatro pivôs importantes são medidos diretamente na geometria
    estática do Michael, que chega em uma A-pose bem definida:
      clavícula -> ombro (Arm) -> cotovelo (ForeArm) -> punho (Hand).

    IMPORTANTE: o retargetPackedClips transfere rotações relativas à T-pose.
    A cadeia é girada até a A-pose só durante o bind (poseBoneTowards) e
    volta aos quaternions originais do Mixamo logo depois.
  */

  const median = values => {
    if(!values.length){
      return null;
    }

    const ordered = [...values]
      .sort((a, b) => a - b);

    const middle =
      Math.floor(ordered.length / 2);

    return ordered.length % 2
      ? ordered[middle]
      : (ordered[middle - 1] + ordered[middle]) * 0.5;
  };

  const findMichaelArmLandmark = (
    sideSign,
    outwardMin,
    outwardMax,
    heightMin,
    heightMax
  ) => {

    const candidates =
      michaelSurfacePoints.filter(point => {
        const outward =
          sideSign *
          (point.x - michaelCenterX) /
          michaelHalfSpan;

        const height =
          (point.y - michaelBottomY) /
          michaelHeight;

        return (
          outward >= outwardMin &&
          outward <= outwardMax &&
          height >= heightMin &&
          height <= heightMax
        );
      });

    if(!candidates.length){
      return null;
    }

    return new THREE.Vector3(
      median(candidates.map(point => point.x)),
      median(candidates.map(point => point.y)),
      median(candidates.map(point => point.z))
    );

  };

  const michaelArmGuides = new Map();

  const fitArmToMichael = side => {

    const prefix =
      `mixamorig${side}`;

    const baseHand =
      getBaseBoneWorld(`${prefix}Hand`);

    if(!baseHand){
      return;
    }

    const sideSign =
      Math.sign(
        baseHand.x - michaelCenterX
      ) ||
      (side === 'Left' ? 1 : -1);

    /*
      v2.10 — template anatômico baseado na ficha aprovada do Michael
      ----------------------------------------------------------------
      Para estabilizar Thriller, usamos um template explícito derivado da
      ficha visual aprovada pelo usuário. A malha do Michael já está correta;
      o que precisa ficar estável é apenas a cadeia do braço.

      O importante aqui é:
      - ombro claramente para FORA do tórax;
      - cotovelo no meio do alcance do braço;
      - punho chegando perto da largura vista na ficha;
      - leve avanço em Z para manter o braço ao lado/frente do corpo,
        nunca colapsando para trás do tronco.
    */
    const shoulder =
      new THREE.Vector3(
        michaelCenterX +
          sideSign * michaelHalfSpan * 0.16,
        michaelBottomY + michaelHeight * 0.805,
        michaelCenterZ + michaelHeight * 0.006
      );

    const arm =
      new THREE.Vector3(
        michaelCenterX +
          sideSign * michaelHalfSpan * 0.30,
        michaelBottomY + michaelHeight * 0.778,
        michaelCenterZ + michaelHeight * 0.012
      );

    const foreArm =
      new THREE.Vector3(
        michaelCenterX +
          sideSign * michaelHalfSpan * 0.58,
        michaelBottomY + michaelHeight * 0.705,
        michaelCenterZ + michaelHeight * 0.018
      );

    const hand =
      new THREE.Vector3(
        michaelCenterX +
          sideSign * michaelHalfSpan * 0.83,
        michaelBottomY + michaelHeight * 0.630,
        michaelCenterZ + michaelHeight * 0.024
      );

    setBoneRigPosition(
      `${prefix}Shoulder`,
      shoulder
    );

    poseBoneTowards(
      `${prefix}Shoulder`,
      `${prefix}Arm`,
      arm
    );

    poseBoneTowards(
      `${prefix}Arm`,
      `${prefix}ForeArm`,
      foreArm
    );

    poseBoneTowards(
      `${prefix}ForeArm`,
      `${prefix}Hand`,
      hand
    );

    michaelArmGuides.set(side, {
      sideSign,
      shoulder,
      arm,
      foreArm,
      hand
    });

    console.info(
      `Michael ${side}: template de braço aplicado`,
      {
        shoulder,
        arm,
        foreArm,
        hand
      }
    );

  };

  fitArmToMichael('Left');
  fitArmToMichael('Right');
  rigRoot.updateMatrixWorld(true);
  collectReferenceSamples();

  /*
    Pesos exclusivos dos braços — v2.9
    -----------------------------------
    Depois de medir os pivôs, classificamos a manga/braço/antebraço/mão por
    proximidade da cadeia correspondente. Se um vértice entra nesse corredor,
    ele NUNCA recebe Spine/Spine2 nem o braço oposto. É isso que impede o
    membro de ser puxado para dentro do peito quando Thriller gira o ombro.
  */
  const michaelArmClosestPoint =
    new THREE.Vector3();

  const michaelArmSegment =
    new THREE.Vector3();

  const michaelArmOffset =
    new THREE.Vector3();

  const distanceToMichaelSegment = (
    point,
    from,
    to
  ) => {

    michaelArmSegment.subVectors(to, from);

    const lengthSq =
      Math.max(
        michaelArmSegment.lengthSq(),
        1e-8
      );

    michaelArmOffset.subVectors(point, from);

    const t =
      THREE.MathUtils.clamp(
        michaelArmOffset.dot(michaelArmSegment) /
          lengthSq,
        0,
        1
      );

    michaelArmClosestPoint
      .copy(from)
      .addScaledVector(
        michaelArmSegment,
        t
      );

    return {
      t,
      distance:
        point.distanceTo(
          michaelArmClosestPoint
        )
    };

  };

  const packWeights = entries => {

    const filtered =
      entries
        .filter(([, weight]) =>
          Number.isFinite(weight) &&
          weight > 0.00001
        )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    const total =
      filtered.reduce(
        (sum, [, weight]) =>
          sum + weight,
        0
      ) || 1;

    const indices = [0, 0, 0, 0];
    const weights = [0, 0, 0, 0];

    filtered.forEach(
      ([index, weight], slot) => {
        indices[slot] = index;
        weights[slot] = weight / total;
      }
    );

    return { indices, weights };

  };

  const michaelArmWeights = point => {

    const normalizedHeight =
      (point.y - michaelBottomY) /
      michaelHeight;

    if(
      normalizedHeight < 0.52 ||
      normalizedHeight > 0.85
    ){
      return null;
    }

    for(const [side, guide] of michaelArmGuides){

      const outward =
        guide.sideSign *
        (point.x - michaelCenterX) /
        michaelHalfSpan;

      /*
        Faixa lateral do braço segundo a ficha de referência.
        0.20 ainda captura a raiz da manga; >1.10 já é ruído externo.
      */
      if(outward < 0.20 || outward > 1.10){
        continue;
      }

      const prefix =
        `mixamorig${side}`;

      const shoulderIndex =
        canonicalIndexByName.get(
          `${prefix}Shoulder`
        );

      const armIndex =
        canonicalIndexByName.get(
          `${prefix}Arm`
        );

      const foreArmIndex =
        canonicalIndexByName.get(
          `${prefix}ForeArm`
        );

      const handIndex =
        canonicalIndexByName.get(
          `${prefix}Hand`
        );

      if(
        shoulderIndex == null ||
        armIndex == null ||
        foreArmIndex == null ||
        handIndex == null
      ){
        continue;
      }

      const shoulderSegment =
        distanceToMichaelSegment(
          point,
          guide.shoulder,
          guide.arm
        );

      const upper =
        distanceToMichaelSegment(
          point,
          guide.arm,
          guide.foreArm
        );

      const lower =
        distanceToMichaelSegment(
          point,
          guide.foreArm,
          guide.hand
        );

      const handDistance =
        point.distanceTo(guide.hand);

      const shoulderRadius =
        michaelHeight * 0.092;

      const armRadius =
        michaelHeight * 0.076;

      const handRadius =
        michaelHeight * 0.068;

      /*
        A parte mais próxima do tórax ainda precisa seguir a clavícula/ombro.
        Damos um pequeno bônus ao segmento do ombro para impedir que a manga
        caia para dentro do peito durante rotações fortes do Thriller.
      */
      const weightedShoulder =
        shoulderSegment.distance * 0.84;

      const closest =
        Math.min(
          weightedShoulder,
          upper.distance,
          lower.distance,
          handDistance
        );

      if(
        closest >
        Math.max(
          shoulderRadius,
          armRadius,
          handRadius
        )
      ){
        continue;
      }

      if(closest === weightedShoulder){
        const blendToArm =
          THREE.MathUtils.smoothstep(
            shoulderSegment.t,
            0.34,
            1.0
          );

        return packWeights([
          [
            shoulderIndex,
            0.72 * (1 - blendToArm)
          ],
          [
            armIndex,
            0.28 + 0.72 * blendToArm
          ]
        ]);
      }

      if(closest === upper.distance){
        const elbowBlend =
          THREE.MathUtils.smoothstep(
            upper.t,
            0.68,
            1.0
          );

        return packWeights([
          [
            armIndex,
            1 - elbowBlend
          ],
          [
            foreArmIndex,
            elbowBlend
          ]
        ]);
      }

      if(closest === lower.distance){
        const wristBlend =
          THREE.MathUtils.smoothstep(
            lower.t,
            0.70,
            1.0
          );

        return packWeights([
          [
            foreArmIndex,
            1 - wristBlend
          ],
          [
            handIndex,
            wristBlend
          ]
        ]);
      }

      return packWeights([
        [handIndex, 1]
      ]);

    }

    return null;

  };

  const anatomicalSegments = [];
  const anatomicalPoints = [];

  const addSegment = (
    fromName,
    toName,
    influenceName = fromName
  ) => {

    const from =
      boneLocalPosition(fromName);

    const to =
      boneLocalPosition(toName);

    const boneIndex =
      canonicalIndexByName.get(
        influenceName
      );

    const childIndex =
      canonicalIndexByName.get(
        toName
      );

    if(
      !from ||
      !to ||
      boneIndex == null
    ){
      return;
    }

    anatomicalSegments.push({
      from,
      to,
      boneIndex,
      childIndex:
        childIndex == null
          ? boneIndex
          : childIndex,
      midpointX:
        (from.x + to.x) * 0.5,
      name: influenceName
    });

  };

  const addPointInfluence = name => {

    const point =
      boneLocalPosition(name);

    const boneIndex =
      canonicalIndexByName.get(name);

    if(
      !point ||
      boneIndex == null
    ){
      return;
    }

    anatomicalPoints.push({
      point,
      boneIndex,
      name
    });

  };

  /* Eixo central. */
  addSegment('mixamorigHips', 'mixamorigSpine');
  addSegment('mixamorigSpine', 'mixamorigSpine1');
  addSegment('mixamorigSpine1', 'mixamorigSpine2');
  addSegment('mixamorigSpine2', 'mixamorigNeck');
  addSegment('mixamorigNeck', 'mixamorigHead');

  /* Braço esquerdo. */
  addSegment('mixamorigSpine2', 'mixamorigLeftShoulder', 'mixamorigSpine2');
  addSegment('mixamorigLeftShoulder', 'mixamorigLeftArm');
  addSegment('mixamorigLeftArm', 'mixamorigLeftForeArm');
  addSegment('mixamorigLeftForeArm', 'mixamorigLeftHand');

  /* Braço direito. */
  addSegment('mixamorigSpine2', 'mixamorigRightShoulder', 'mixamorigSpine2');
  addSegment('mixamorigRightShoulder', 'mixamorigRightArm');
  addSegment('mixamorigRightArm', 'mixamorigRightForeArm');
  addSegment('mixamorigRightForeArm', 'mixamorigRightHand');

  /* Pernas. */
  addSegment('mixamorigHips', 'mixamorigLeftUpLeg', 'mixamorigHips');
  addSegment('mixamorigLeftUpLeg', 'mixamorigLeftLeg');
  addSegment('mixamorigLeftLeg', 'mixamorigLeftFoot');
  addSegment('mixamorigLeftFoot', 'mixamorigLeftToeBase');

  addSegment('mixamorigHips', 'mixamorigRightUpLeg', 'mixamorigHips');
  addSegment('mixamorigRightUpLeg', 'mixamorigRightLeg');
  addSegment('mixamorigRightLeg', 'mixamorigRightFoot');
  addSegment('mixamorigRightFoot', 'mixamorigRightToeBase');

  /* Pontas importantes: evitam cabeça/mãos/pés ficarem presos ao pai. */
  [
    'mixamorigHead',
    'mixamorigLeftHand',
    'mixamorigRightHand',
    'mixamorigLeftFoot',
    'mixamorigRightFoot',
    'mixamorigLeftToeBase',
    'mixamorigRightToeBase'
  ].forEach(addPointInfluence);

  const segmentClosestPoint =
    new THREE.Vector3();

  const segmentVector =
    new THREE.Vector3();

  const pointVector =
    new THREE.Vector3();

  /*
    Região do ombro/ombreira: pesos copiados do corpo de referência já
    posado na A-pose do Michael (transição suave feita pelo artista entre
    tronco, clavícula e braço).
  */
  const SHOULDER_ZONE = {
    outwardMin: 0.04,
    outwardMax: 0.17,
    heightMin: 0.68,
    heightMax: 0.90
  };

  const inShoulderZone = point => {
    const outward =
      Math.abs(point.x - michaelCenterX) /
      michaelHeight;

    const height =
      (point.y - michaelBottomY) /
      michaelHeight;

    return (
      outward >= SHOULDER_ZONE.outwardMin &&
      outward <= SHOULDER_ZONE.outwardMax &&
      height >= SHOULDER_ZONE.heightMin &&
      height <= SHOULDER_ZONE.heightMax
    );
  };

  const anatomicalWeights = point => {

    if(inShoulderZone(point)){
      return nearestWeights(point);
    }

    const dedicatedArmWeights =
      michaelArmWeights(point);

    if(dedicatedArmWeights){
      return dedicatedArmWeights;
    }

    if(anatomicalSegments.length < 10){
      return nearestWeights(point);
    }

    const aggregate =
      new Map();

    const addWeight = (
      boneIndex,
      weight
    ) => {

      if(
        boneIndex == null ||
        !Number.isFinite(weight) ||
        weight <= 0
      ){
        return;
      }

      aggregate.set(
        boneIndex,
        (aggregate.get(boneIndex) || 0) +
          weight
      );

    };

    const epsilon =
      Math.max(
        rigSize.y * 0.012,
        0.0001
      );

    for(const segment of anatomicalSegments){

      segmentVector
        .subVectors(
          segment.to,
          segment.from
        );

      const lengthSq =
        Math.max(
          segmentVector.lengthSq(),
          1e-8
        );

      pointVector
        .subVectors(
          point,
          segment.from
        );

      const t =
        THREE.MathUtils.clamp(
          pointVector.dot(segmentVector) /
            lengthSq,
          0,
          1
        );

      segmentClosestPoint
        .copy(segment.from)
        .addScaledVector(
          segmentVector,
          t
        );

      let distance =
        point.distanceTo(
          segmentClosestPoint
        );

      /*
        Impede que um vértice do lado esquerdo seja capturado por um membro
        do lado direito (e vice-versa), sem depender da convenção de sinal X.
      */
      const memberIsSide =
        /Left|Right/.test(
          segment.name
        );

      if(
        memberIsSide &&
        Math.abs(point.x) >
          rigSize.x * 0.045 &&
        Math.abs(segment.midpointX) >
          rigSize.x * 0.035 &&
        Math.sign(point.x) !==
          Math.sign(segment.midpointX)
      ){
        distance +=
          rigSize.y * 0.65;
      }

      /*
        Potência alta = influência local. É justamente o que evita que mão e
        tronco puxem simultaneamente o mesmo triângulo quando os braços giram.
      */
      const proximity =
        1 /
        Math.pow(
          Math.max(
            distance,
            epsilon
          ),
          3.15
        );

      /*
        No final de cada segmento fazemos uma pequena transição para o osso
        filho, suavizando cotovelo, joelho, punho e tornozelo.
      */
      const childBlend =
        THREE.MathUtils.smoothstep(
          t,
          0.76,
          1
        ) * 0.42;

      addWeight(
        segment.boneIndex,
        proximity *
          (1 - childBlend)
      );

      addWeight(
        segment.childIndex,
        proximity * childBlend
      );

    }

    for(const influence of anatomicalPoints){

      let distance =
        point.distanceTo(
          influence.point
        );

      const memberIsSide =
        /Left|Right/.test(
          influence.name
        );

      if(
        memberIsSide &&
        Math.abs(point.x) >
          rigSize.x * 0.045 &&
        Math.abs(influence.point.x) >
          rigSize.x * 0.035 &&
        Math.sign(point.x) !==
          Math.sign(influence.point.x)
      ){
        distance +=
          rigSize.y * 0.65;
      }

      const proximity =
        0.72 /
        Math.pow(
          Math.max(
            distance,
            epsilon * 1.25
          ),
          3.15
        );

      addWeight(
        influence.boneIndex,
        proximity
      );

    }

    const strongest =
      [...aggregate.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    if(!strongest.length){
      return nearestWeights(point);
    }

    /*
      Evita micro-influências distantes. Elas eram outra fonte de vértices
      esticados em animações de grande amplitude.
    */
    const maxWeight =
      strongest[0][1] || 1;

    const filtered =
      strongest.filter(
        ([, weight], index) =>
          index === 0 ||
          weight >= maxWeight * 0.055
      );

    const total =
      filtered.reduce(
        (sum, [, weight]) =>
          sum + weight,
        0
      ) || 1;

    const indices = [0, 0, 0, 0];
    const weights = [0, 0, 0, 0];

    filtered.forEach(
      ([boneIndex, weight], slot) => {
        indices[slot] = boneIndex;
        weights[slot] = weight / total;
      }
    );

    return {
      indices,
      weights
    };

  };

  const michaelMeshes = [];

  staticSource.traverse(object => {
    if(
      object.isMesh &&
      object.geometry?.getAttribute('position')
    ){
      michaelMeshes.push(object);
    }
  });

  if(!michaelMeshes.length){
    throw new Error(
      'O arquivo Michael não contém uma malha renderizável.'
    );
  }

  /*
    Suavização de normais sem destruir UVs
    --------------------------------------
    O FBX do Michael vem com vários vértices duplicados por UV/material.
    Recalcular normals de forma comum deixa cada triângulo "facetado".
    Aqui somamos as normais das faces que ocupam a MESMA posição no espaço,
    inclusive quando os vértices são duplicados. Assim a textura continua
    intacta, mas o corpo volta a ter o sombreado suave visto no preview.
  */
  const smoothNormalsAcrossPositionSeams = geometry => {

    const positions =
      geometry.getAttribute('position');

    if(!positions || positions.count < 3){
      return;
    }

    const tolerance =
      Math.max(
        rigSize.y * 0.000015,
        1e-6
      );

    const keyForVertex = vertex => {
      const x = positions.getX(vertex);
      const y = positions.getY(vertex);
      const z = positions.getZ(vertex);

      return [
        Math.round(x / tolerance),
        Math.round(y / tolerance),
        Math.round(z / tolerance)
      ].join('|');
    };

    const normalByPosition =
      new Map();

    /*
      Primeiro preferimos as normais originais do FBX. Elas já sabem quais
      faces são frente/costas; apenas unificamos os vértices duplicados de
      uma mesma posição. Isso é mais fiel ao preview do modelo do que
      recalcular toda a orientação do zero.
    */
    const importedNormals =
      geometry.getAttribute('normal');

    if(importedNormals){
      const imported = new THREE.Vector3();

      for(
        let vertex = 0;
        vertex < positions.count;
        vertex++
      ){
        imported
          .fromBufferAttribute(
            importedNormals,
            vertex
          )
          .normalize();

        const key = keyForVertex(vertex);
        let sum = normalByPosition.get(key);

        if(!sum){
          sum = new THREE.Vector3();
          normalByPosition.set(key, sum);
        }

        sum.add(imported);
      }
    }

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();

    const addFace = (
      ia,
      ib,
      ic
    ) => {

      a.fromBufferAttribute(positions, ia);
      b.fromBufferAttribute(positions, ib);
      c.fromBufferAttribute(positions, ic);

      ab.subVectors(b, a);
      ac.subVectors(c, a);
      faceNormal.crossVectors(ab, ac);

      /* Área zero não deve contaminar o acumulador. */
      if(faceNormal.lengthSq() <= 1e-14){
        return;
      }

      for(const vertex of [ia, ib, ic]){
        const key = keyForVertex(vertex);
        let sum = normalByPosition.get(key);

        if(!sum){
          sum = new THREE.Vector3();
          normalByPosition.set(key, sum);
        }

        /* Não normalizamos aqui: faces maiores têm peso proporcional. */
        sum.add(faceNormal);
      }
    };

    if(!importedNormals){
      if(geometry.index){
        const index = geometry.index;

        for(
          let item = 0;
          item + 2 < index.count;
          item += 3
        ){
          addFace(
            index.getX(item),
            index.getX(item + 1),
            index.getX(item + 2)
          );
        }
      }else{
        for(
          let vertex = 0;
          vertex + 2 < positions.count;
          vertex += 3
        ){
          addFace(
            vertex,
            vertex + 1,
            vertex + 2
          );
        }
      }
    }

    const normalArray =
      new Float32Array(
        positions.count * 3
      );

    const normal =
      new THREE.Vector3();

    for(
      let vertex = 0;
      vertex < positions.count;
      vertex++
    ){
      const sum =
        normalByPosition.get(
          keyForVertex(vertex)
        );

      normal.copy(
        sum || new THREE.Vector3(0, 1, 0)
      );

      if(normal.lengthSq() > 1e-12){
        normal.normalize();
      }else{
        normal.set(0, 1, 0);
      }

      normal.toArray(
        normalArray,
        vertex * 3
      );
    }

    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(
        normalArray,
        3
      )
    );

    geometry.getAttribute('normal').needsUpdate = true;
  };

  /*
    Manga até o punho
    -----------------
    No FBX a manga vermelha termina no cotovelo e o antebraço usa uma peça
    de pele do atlas (bem mais fina que a manga). Para a jaqueta do Thriller,
    os vértices do antebraço passam a amostrar a segunda peça de manga do
    atlas e são engrossados em torno do próprio eixo até a largura da manga.
    UVs em fração do atlas 512x256; v cresce para cima.
  */
  const FOREARM_SKIN_UV = {
    uMin: 188 / 512,
    uMax: 254 / 512,
    vElbow: 1 - 148 / 256,
    vWrist: 1 - 230 / 256
  };

  const SLEEVE_UV = {
    uMin: 196 / 512,
    uMax: 250 / 512,
    vElbow: 1 - 64 / 256,
    vWrist: 1 - 104 / 256
  };

  const SLEEVE_THICKNESS = 1.35;

  const extendMichaelSleeves = geometry => {

    const positions = geometry.getAttribute('position');
    const uvs = geometry.getAttribute('uv');

    if(!positions || !uvs){
      return;
    }

    const sides = new Map();
    const point = new THREE.Vector3();

    for(let vertex = 0; vertex < positions.count; vertex++){

      const u = uvs.getX(vertex);
      const v = uvs.getY(vertex);

      if(
        u < FOREARM_SKIN_UV.uMin ||
        u > FOREARM_SKIN_UV.uMax ||
        v > FOREARM_SKIN_UV.vElbow ||
        v < FOREARM_SKIN_UV.vWrist
      ){
        continue;
      }

      point.fromBufferAttribute(positions, vertex);

      const outward =
        Math.abs(point.x - michaelCenterX) /
        michaelHalfSpan;

      const height =
        (point.y - michaelBottomY) /
        michaelHeight;

      /* Só os braços usam essa peça; a faixa evita tocar pernas/tornozelos. */
      if(outward < 0.35 || height < 0.52 || height > 0.82){
        continue;
      }

      const side = Math.sign(point.x - michaelCenterX);

      if(!sides.has(side)){
        sides.set(side, []);
      }

      sides.get(side).push(vertex);

    }

    const axisStart = new THREE.Vector3();
    const axisEnd = new THREE.Vector3();
    const axis = new THREE.Vector3();
    const offset = new THREE.Vector3();

    for(const [side, vertices] of sides){

      const guide =
        [...michaelArmGuides.values()]
          .find(item => item.sideSign === side);

      if(!guide || vertices.length < 6){
        continue;
      }

      /* Eixo real do antebraço: centroides da metade do cotovelo e do punho. */
      const direction =
        guide.hand.clone().sub(guide.foreArm).normalize();

      const projected =
        vertices
          .map(vertex => ({
            vertex,
            along:
              point
                .fromBufferAttribute(positions, vertex)
                .sub(guide.foreArm)
                .dot(direction)
          }))
          .sort((a, b) => a.along - b.along);

      const middle = Math.floor(projected.length / 2);

      const centroid = (items, target) => {
        target.set(0, 0, 0);
        for(const { vertex } of items){
          target.add(point.fromBufferAttribute(positions, vertex));
        }
        return target.divideScalar(items.length);
      };

      centroid(projected.slice(0, middle), axisStart);
      centroid(projected.slice(middle), axisEnd);
      axis.subVectors(axisEnd, axisStart).normalize();

      for(const { vertex } of projected){

        point.fromBufferAttribute(positions, vertex);
        offset.subVectors(point, axisStart);

        const along = offset.dot(axis);
        offset.addScaledVector(axis, -along);

        point
          .copy(axisStart)
          .addScaledVector(axis, along)
          .addScaledVector(offset, SLEEVE_THICKNESS);

        positions.setXYZ(vertex, point.x, point.y, point.z);

        const u =
          (uvs.getX(vertex) - FOREARM_SKIN_UV.uMin) /
          (FOREARM_SKIN_UV.uMax - FOREARM_SKIN_UV.uMin);

        const v =
          (uvs.getY(vertex) - FOREARM_SKIN_UV.vElbow) /
          (FOREARM_SKIN_UV.vWrist - FOREARM_SKIN_UV.vElbow);

        uvs.setXY(
          vertex,
          THREE.MathUtils.lerp(SLEEVE_UV.uMin, SLEEVE_UV.uMax, u),
          THREE.MathUtils.lerp(SLEEVE_UV.vElbow, SLEEVE_UV.vWrist, v)
        );

      }

    }

    positions.needsUpdate = true;
    uvs.needsUpdate = true;

  };

  /*
    A ombreira do FBX é um bloco plano (~0.85 da altura) que termina num
    degrau de ~7% da altura sobre o braço. Em A-pose o degrau some na linha
    do braço; com o braço abaixado vira uma ponta. Arredondamos o bloco:
    o excesso acima do topo do braço diminui em direção à ponta do ombro.
  */
  const SHOULDER_PAD = {
    base: 0.775,
    inner: 0.075,
    outer: 0.125,
    limit: 0.145,
    flatten: 0.6
  };

  const softenShoulderPads = geometry => {

    const positions = geometry.getAttribute('position');

    if(!positions){
      return;
    }

    const point = new THREE.Vector3();
    const baseY = michaelBottomY + michaelHeight * SHOULDER_PAD.base;

    for(let vertex = 0; vertex < positions.count; vertex++){

      point.fromBufferAttribute(positions, vertex);

      const outward =
        Math.abs(point.x - michaelCenterX) /
        michaelHeight;

      if(
        point.y <= baseY ||
        outward < SHOULDER_PAD.inner - 0.01 ||
        outward > SHOULDER_PAD.limit
      ){
        continue;
      }

      const flatten =
        SHOULDER_PAD.flatten *
        THREE.MathUtils.smoothstep(
          outward,
          SHOULDER_PAD.inner,
          SHOULDER_PAD.outer
        );

      positions.setY(
        vertex,
        baseY + (point.y - baseY) * (1 - flatten)
      );

    }

    positions.needsUpdate = true;

  };

  const newMeshes = [];

  for(const sourceMesh of michaelMeshes){

    const geometry =
      sourceMesh.geometry.clone();

    geometry.applyMatrix4(
      sourceMesh.matrixWorld
    );

    geometry.applyMatrix4(
      fitMatrix
    );

    extendMichaelSleeves(geometry);
    softenShoulderPads(geometry);

    /* Mantém a silhueta original, mas remove o aspecto triangular/facetado. */
    smoothNormalsAcrossPositionSeams(
      geometry
    );

    const positions =
      geometry.getAttribute('position');

    const indicesArray =
      new Uint16Array(
        positions.count * 4
      );

    const weightsArray =
      new Float32Array(
        positions.count * 4
      );

    const point =
      new THREE.Vector3();

    for(
      let vertex = 0;
      vertex < positions.count;
      vertex++
    ){

      point.fromBufferAttribute(
        positions,
        vertex
      );

      const assigned =
        anatomicalWeights(point);

      for(let slot = 0; slot < 4; slot++){
        indicesArray[vertex * 4 + slot] =
          assigned.indices[slot] || 0;

        weightsArray[vertex * 4 + slot] =
          assigned.weights[slot] || 0;
      }

    }

    geometry.setAttribute(
      'skinIndex',
      new THREE.Uint16BufferAttribute(
        indicesArray,
        4
      )
    );

    geometry.setAttribute(
      'skinWeight',
      new THREE.Float32BufferAttribute(
        weightsArray,
        4
      )
    );

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const prepareMichaelMaterial = sourceMaterial => {

      if(!sourceMaterial){
        return sourceMaterial;
      }

      const material =
        sourceMaterial.clone();

      /*
        O FBX original conecta a própria textura de cor também ao canal
        TransparencyFactor. O FBXLoader interpreta isso como alphaMap e deixa
        o personagem translúcido. Para o jogo a roupa/corpo devem ser sólidos:
        preservamos a textura RGB, mas removemos qualquer transparência do
        material do Michael.
      */
      material.transparent = false;
      material.opacity = 1;
      material.alphaMap = null;
      material.alphaTest = 0;
      material.depthWrite = true;
      material.depthTest = true;
      material.premultipliedAlpha = false;
      material.blending = THREE.NormalBlending;

      /*
        O preview original usa sombreado suave. Alguns materiais do FBX
        carregam vertex colors/flat shading que, sob as luzes fortes do jogo,
        viram triângulos claros/escuros. Para o Michael a cor deve vir da
        textura original + iluminação da fase, não das cores por vértice.
      */
      material.flatShading = false;
      material.vertexColors = false;

      if('shininess' in material){
        material.shininess = Math.min(
          material.shininess ?? 18,
          18
        );
      }

      if(material.specular?.setHex){
        material.specular.setHex(0x181818);
      }

      if('roughness' in material){
        material.roughness = Math.max(
          material.roughness ?? 0.72,
          0.72
        );
      }

      if('metalness' in material){
        material.metalness = Math.min(
          material.metalness ?? 0,
          0.04
        );
      }

      if('transmission' in material){
        material.transmission = 0;
      }

      if(material.color){
        /* Branco = mostra a cor original da textura sem dessaturar o vermelho. */
        material.color.set(0xffffff);
      }

      if(material.map){
        material.map.colorSpace =
          THREE.SRGBColorSpace;
        material.map.needsUpdate = true;
      }

      material.userData = {
        ...material.userData,
        michaelThrillerMaterial: true
      };

      material.needsUpdate = true;

      return material;

    };

    const material =
      Array.isArray(sourceMesh.material)
        ? sourceMesh.material.map(
            prepareMichaelMaterial
          )
        : prepareMichaelMaterial(
            sourceMesh.material
          );

    const skin =
      new THREE.SkinnedMesh(
        geometry,
        material
      );

    skin.name =
      `MichaelThriller_${sourceMesh.name || 'Mesh'}`;

    skin.castShadow = true;
    skin.receiveShadow = true;
    skin.frustumCulled = false;

    rigRoot.add(skin);
    newMeshes.push(skin);

  }

  rigRoot.updateMatrixWorld(true);

  const michaelSkeleton =
    new THREE.Skeleton(
      [...canonicalBones]
    );

  michaelSkeleton.calculateInverses();

  for(const mesh of newMeshes){
    mesh.bind(
      michaelSkeleton,
      mesh.matrixWorld.clone()
    );
    mesh.normalizeSkinWeights();
  }

  /* Bind feito em A-pose; o template volta à T-pose que as animações esperam. */
  for(const [bone, quaternion] of restQuaternions){
    bone.quaternion.copy(quaternion);
  }

  /* O corpo Samba vira apenas o rig invisível por baixo da skin. */
  for(const mesh of referenceMeshes){
    mesh.visible = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.userData.thrillerRigReference = true;
  }

  rigRoot.userData.thrillerAutoRig = true;
  rigRoot.userData.thrillerSkin = 'Michael Jackson';
  rigRoot.updateMatrixWorld(true);

  return rigRoot;

}

function tryPrepareThrillerMichael(){

  if(
    thrillerMichaelPreparing ||
    thrillerModels.p1 ||
    !thrillerMichaelSource ||
    !baseModel
  ){
    return;
  }

  thrillerMichaelPreparing = true;

  try{

    /*
      Se algum arquivo futuro já vier com rig Mixamo, usamos diretamente.
      O ZIP atual não possui rig, então cai no auto-rig acima.
    */
    thrillerModels.p1 =
      hasMixamoRig(thrillerMichaelSource)
        ? thrillerMichaelSource
        : buildAutoRiggedThrillerSkin(
            thrillerMichaelSource,
            baseModel
          );

    thrillerCharacterErrors.delete('p1');

    console.info(
      'Skin Michael Jackson preparada para Thriller.',
      thrillerModels.p1.userData?.thrillerAutoRig
        ? '(auto-rig Mixamo aplicado)'
        : '(rig Mixamo nativo)'
    );

  }catch(error){

    /*
      Nunca deixa a fase inteira indisponível por causa de uma skin.
      Em caso extremo, mantém o P1 padrão e a partida continua jogável.
    */
    console.error(
      'Falha ao preparar Michael Jackson para Thriller. Usando P1 padrão:',
      error
    );

    thrillerModels.p1 = baseModel;
    thrillerCharacterErrors.delete('p1');

  }finally{
    thrillerMichaelPreparing = false;
    updateMenuAvailability();
  }

  updateStartButtonState();

}


Object.assign(globalThis, {
  hasMixamoRig,
  buildAutoRiggedThrillerSkin,
  tryPrepareThrillerMichael
});
