import '../core/state.js';

function loadSongDance(id){

  const song =
    SONGS[id];

  if(
    !song.dance ||
    danceFiles[id] ||
    danceLoading.has(id)
  ){
    return;
  }

  danceLoading.add(id);

  loadPackedDance(song.dance)
    .then(
      file => {
        danceFiles[id] = file;
      }
    )
    .catch(
      error => {

        console.error(
          'Erro na coreografia:',
          error
        );

        danceErrors.add(id);

      }
    )
    .finally(
      () => {

        danceLoading.delete(id);
        updateMenuAvailability();

      }
    );

}

function placeModel(
  object,
  x,
  targetHeight
){

  object.updateMatrixWorld(true);

  const box =
    new THREE.Box3()
      .setFromObject(
        object
      );

  const size =
    new THREE.Vector3();

  box.getSize(size);

  object.scale.setScalar(
    targetHeight /
    Math.max(
      size.y,
      .001
    )
  );

  object.updateMatrixWorld(true);

  const box2 =
    new THREE.Box3()
      .setFromObject(
        object
      );

  const center =
    new THREE.Vector3();

  box2.getCenter(center);

  object.position.x =
    x -
    center.x;

  object.position.z =
    -center.z;

  object.position.y =
    -box2.min.y;

  object.rotation.set(
    0,
    0,
    0
  );

  object.updateMatrixWorld(true);

}

function retargetMixamoMotionClip(
  source,
  clip,
  target,
  outputName
){

  const FPS = 30;
  const HIPS = 'mixamorigHips';

  source.updateMatrixWorld(true);
  target.updateMatrixWorld(true);

  const sourceFirst = new Map();

  source.traverse(object => {
    if(
      object.isBone &&
      !sourceFirst.has(object.name)
    ){
      sourceFirst.set(object.name, object);
    }
  });

  const targetBones = [];
  const targetFirst = new Map();

  target.traverse(object => {
    if(!object.isBone){
      return;
    }

    targetBones.push(object);

    if(!targetFirst.has(object.name)){
      targetFirst.set(object.name, object);
    }
  });

  const animatedNames = new Set(
    clip.tracks
      .filter(track =>
        track.name.endsWith('.quaternion')
      )
      .map(track =>
        track.name.replace(/\.quaternion$/, '')
      )
      .filter(name =>
        sourceFirst.has(name) &&
        targetFirst.has(name)
      )
  );

  if(!animatedNames.size){
    throw new Error(
      `Nenhum osso compatível encontrado em ${outputName}.`
    );
  }

  const sourceRestInverse = new Map();

  for(const name of animatedNames){
    sourceRestInverse.set(
      name,
      sourceFirst
        .get(name)
        .getWorldQuaternion(
          new THREE.Quaternion()
        )
        .invert()
    );
  }

  const targetRest = new Map(
    targetBones.map(bone => [
      bone,
      {
        local: bone.quaternion.clone(),
        world: bone.getWorldQuaternion(
          new THREE.Quaternion()
        ),
        parentWorld: bone.parent
          ? bone.parent.getWorldQuaternion(
              new THREE.Quaternion()
            )
          : new THREE.Quaternion()
      }
    ])
  );

  const sourceHips =
    sourceFirst.get(HIPS);

  const targetHips =
    targetFirst.get(HIPS);

  if(!sourceHips || !targetHips){
    throw new Error(
      `O clip ${outputName} não possui quadril Mixamo compatível.`
    );
  }

  const sourceHipsRest =
    sourceHips.getWorldPosition(
      new THREE.Vector3()
    );

  const targetHipsRest =
    targetHips.getWorldPosition(
      new THREE.Vector3()
    );

  const hipsScale =
    Math.abs(sourceHipsRest.y) > .001
      ? targetHipsRest.y /
        sourceHipsRest.y
      : 1;

  const toTargetHipsParent =
    targetHips.parent
      ? targetHips.parent.matrixWorld
          .clone()
          .invert()
      : new THREE.Matrix4();

  const frames =
    Math.max(
      2,
      Math.ceil(clip.duration * FPS) + 1
    );

  const times =
    Float32Array.from(
      { length: frames },
      (_, frame) =>
        Math.min(
          frame / FPS,
          clip.duration
        )
    );

  const output = new Map();
  const targetToSource = new Map();

  for(const name of animatedNames){
    const targetBone =
      targetFirst.get(name);

    output.set(
      targetBone,
      new Float32Array(frames * 4)
    );

    targetToSource.set(
      targetBone,
      sourceFirst.get(name)
    );
  }

  const hipsValues =
    new Float32Array(frames * 3);

  const world = new Map(
    targetBones.map(bone => [
      bone,
      new THREE.Quaternion()
    ])
  );

  const mixer =
    new THREE.AnimationMixer(source);

  const action =
    mixer.clipAction(clip);

  action.play();

  const sourceWorld =
    new THREE.Quaternion();

  const delta =
    new THREE.Quaternion();

  const local =
    new THREE.Quaternion();

  const inverse =
    new THREE.Quaternion();

  const posed =
    new THREE.Quaternion();

  const position =
    new THREE.Vector3();

  for(
    let frame = 0;
    frame < frames;
    frame++
  ){

    mixer.setTime(times[frame]);
    source.updateMatrixWorld(true);

    for(const bone of targetBones){

      const info =
        targetRest.get(bone);

      const parentWorld =
        bone.parent &&
        world.has(bone.parent)
          ? world.get(bone.parent)
          : info.parentWorld;

      const sourceBone =
        targetToSource.get(bone);

      if(sourceBone){

        sourceBone.getWorldQuaternion(
          sourceWorld
        );

        delta.multiplyQuaternions(
          sourceWorld,
          sourceRestInverse.get(
            bone.name
          )
        );

        posed.multiplyQuaternions(
          delta,
          info.world
        );

        local.multiplyQuaternions(
          inverse
            .copy(parentWorld)
            .invert(),
          posed
        );

        local.toArray(
          output.get(bone),
          frame * 4
        );

      }else{

        posed.multiplyQuaternions(
          parentWorld,
          info.local
        );

      }

      world.get(bone).copy(posed);

    }

    sourceHips
      .getWorldPosition(position)
      .sub(sourceHipsRest)
      .multiplyScalar(hipsScale)
      .add(targetHipsRest)
      .applyMatrix4(toTargetHipsParent)
      .toArray(
        hipsValues,
        frame * 3
      );

  }

  mixer.stopAllAction();
  mixer.uncacheRoot(source);

  const tracks =
    [...output].map(
      ([bone, values]) =>
        new THREE.QuaternionKeyframeTrack(
          bone.name + '.quaternion',
          times,
          values
        )
    );

  tracks.push(
    new THREE.VectorKeyframeTrack(
      targetHips.name + '.position',
      times,
      hipsValues
    )
  );

  return new THREE.AnimationClip(
    outputName,
    clip.duration,
    tracks
  );

}

function prepareExternalAnimations(){

  if(!baseModel){
    return;
  }

  if(
    !defeatClip &&
    defeatSource &&
    defeatRawClip
  ){

    try{
      defeatClip =
        retargetMixamoMotionClip(
          defeatSource,
          defeatRawClip,
          baseModel,
          'defeat-retargeted'
        );

      defeatAnimationError = false;

    }catch(error){

      defeatAnimationError = true;

      console.error(
        'Falha ao mapear Dying.fbx para o personagem:',
        error
      );

    }

  }

  if(
    !victoryClip &&
    victorySource &&
    victoryRawClip
  ){

    try{
      victoryClip =
        retargetMixamoMotionClip(
          victorySource,
          victoryRawClip,
          baseModel,
          'victory-retargeted'
        );

      victoryAnimationError = false;

    }catch(error){

      victoryAnimationError = true;

      console.error(
        'Falha ao mapear Laughing.fbx para o personagem:',
        error
      );

    }

  }

  if(
    !menuIdleClip &&
    menuIdleSource &&
    menuIdleRawClip
  ){

    try{
      menuIdleClip = retargetMixamoMotionClip(
        menuIdleSource,
        menuIdleRawClip,
        baseModel,
        'menu-idle-retargeted'
      );
      menuIdleAnimationError = false;
    }catch(error){
      menuIdleAnimationError = true;
      console.error('Falha ao mapear Zombie Idle.fbx para o personagem:', error);
    }

  }

  for(const playerId of ['p1', 'p2']){

    if(
      preMatchClips[playerId] ||
      !preMatchSources[playerId] ||
      !preMatchRawClips[playerId]
    ){
      continue;
    }

    try{

      preMatchClips[playerId] =
        retargetMixamoMotionClip(
          preMatchSources[playerId],
          preMatchRawClips[playerId],
          baseModel,
          `pre-match-${playerId}`
        );

      preMatchAnimationErrors.delete(
        playerId
      );

    }catch(error){

      preMatchAnimationErrors.add(
        playerId
      );

      console.error(
        `Falha ao mapear a animação de pré-partida do ${playerId.toUpperCase()}:`,
        error
      );

    }

  }


  for(const playerId of ['p1', 'p2']){

    if(
      completionClips[playerId] ||
      !completionSources[playerId] ||
      !completionRawClips[playerId]
    ){
      continue;
    }

    try{

      completionClips[playerId] =
        retargetMixamoMotionClip(
          completionSources[playerId],
          completionRawClips[playerId],
          baseModel,
          `completion-${playerId}`
        );

      completionAnimationErrors.delete(playerId);

    }catch(error){

      completionAnimationErrors.add(playerId);

      console.error(
        `Falha ao mapear a animação de comemoração do ${playerId.toUpperCase()}:`,
        error
      );

    }

  }

}

function getDanceClips(
  template = baseModel
){

  const file =
    danceFiles[selectedSong];

  if(!file){

    /*
      As músicas sem coreografia empacotada continuam usando o clip Samba
      do personagem padrão. As skins de Thriller nunca passam por este ramo.
    */
    return {
      dance: baseModel.animations[0],
      idle: null
    };

  }

  let perTemplate =
    danceClipCache.get(template);

  if(!perTemplate){
    perTemplate = {};
    danceClipCache.set(
      template,
      perTemplate
    );
  }

  perTemplate[selectedSong] ??=
    retargetPackedClips(
      file,
      template
    );

  return perTemplate[selectedSong];

}

function getCharacterMotionSet(
  template,
  playerId
){

  if(template === baseModel){
    return {
      defeat: defeatClip,
      victory: victoryClip,
      preMatch: preMatchClips[playerId],
      completion: completionClips[playerId],
      menuIdle: menuIdleClip
    };
  }

  let perTemplate =
    characterMotionCache.get(template);

  if(!perTemplate){
    perTemplate = {};
    characterMotionCache.set(
      template,
      perTemplate
    );
  }

  if(
    perTemplate[playerId] &&
    (
      perTemplate[playerId].menuIdle ||
      !menuIdleRawClip
    )
  ){
    return perTemplate[playerId];
  }

  const result = {
    defeat: null,
    victory: null,
    preMatch: null,
    completion: null,
    menuIdle: null
  };

  const retargetSafe = (
    source,
    rawClip,
    name
  ) => {
    if(!source || !rawClip){
      return null;
    }

    try{
      return retargetMixamoMotionClip(
        source,
        rawClip,
        template,
        name
      );
    }catch(error){
      console.error(
        `Falha ao adaptar ${name} para a skin Thriller do ${playerId.toUpperCase()}:`,
        error
      );
      return null;
    }
  };

  result.defeat =
    retargetSafe(
      defeatSource,
      defeatRawClip,
      `thriller-${playerId}-defeat`
    );

  result.victory =
    retargetSafe(
      victorySource,
      victoryRawClip,
      `thriller-${playerId}-victory`
    );

  result.preMatch =
    retargetSafe(
      preMatchSources[playerId],
      preMatchRawClips[playerId],
      `thriller-${playerId}-pre-match`
    );

  result.completion =
    retargetSafe(
      completionSources[playerId],
      completionRawClips[playerId],
      `thriller-${playerId}-completion`
    );

  result.menuIdle =
    retargetSafe(
      menuIdleSource,
      menuIdleRawClip,
      `thriller-${playerId}-menu-idle`
    );

  perTemplate[playerId] = result;
  return result;

}

function getCharacterTemplate(
  playerId
){

  if(
    selectedSong === 'thriller' &&
    thrillerModels[playerId]
  ){
    return thrillerModels[playerId];
  }

  return baseModel;

}

function attachDance(
  object,
  template,
  playerId
){

  const {
    dance,
    idle
  } =
    getDanceClips(template);

  const mixer =
    new THREE.AnimationMixer(
      object
    );

  const action =
    mixer.clipAction(
      dance
    );

  action.play();

  let idleAction = null;

  if(idle){

    idleAction =
      mixer.clipAction(
        idle
      );

    idleAction.play();

    action.setEffectiveWeight(0);

  }

  mixer.setTime(0);

  const motionSet =
    getCharacterMotionSet(
      template,
      playerId
    );

  return {
    type: 'native',
    object,
    template,
    mixer,
    clip: dance,
    action,
    idleAction,
    preMatchClip: motionSet.preMatch,
    defeatClip: motionSet.defeat,
    victoryClip: motionSet.victory,
    completionClip: motionSet.completion,
    menuIdleClip: motionSet.menuIdle,
    menuIdleAction: null,
    menuState: null,
    preMatchAction: null,
    completionAction: null,
    blend: 0,
    enabled: false
  };

}

function startPreMatchAnimation(
  id
){

  const dancer =
    dancers[id];

  const clip =
    dancer?.preMatchClip ||
    preMatchClips[id];

  if(!dancer || !clip){
    return;
  }

  dancer.mixer.stopAllAction();

  const action =
    dancer.mixer.clipAction(clip);

  action.reset();
  action.enabled = true;
  action.setEffectiveWeight(1);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;

  /*
    Independentemente da duração original do FBX, a animação ocupa
    exatamente a janela 3 → 2 → 1. Assim ela termina no DANCE!.
  */
  action.setDuration(PRE_ROLL_SECONDS);
  action.play();

  dancer.preMatchAction = action;
  dancer.enabled = false;

}

function startPreMatchAnimations(){

  startPreMatchAnimation('p1');

  if(mode === 2){
    startPreMatchAnimation('p2');
  }

  preMatchLastAt =
    performance.now();

}

function updatePreMatchAnimations(){

  const now =
    performance.now();

  const delta =
    preMatchLastAt
      ? Math.min(
          .06,
          Math.max(0, (now - preMatchLastAt) / 1000)
        )
      : 0;

  preMatchLastAt = now;

  for(
    const dancer
    of Object.values(dancers)
  ){

    if(
      dancer?.preMatchAction &&
      dancer.preMatchAction.isRunning()
    ){
      dancer.mixer.update(delta);
    }

  }

}

function beginDanceAnimations(){

  for(
    const dancer
    of Object.values(dancers)
  ){

    if(!dancer){
      continue;
    }

    if(dancer.preMatchAction){
      dancer.preMatchAction.stop();
      dancer.preMatchAction = null;
    }

    dancer.action.reset();
    dancer.action.enabled = true;
    dancer.action.setEffectiveWeight(1);
    dancer.action.play();

    if(dancer.idleAction){
      dancer.idleAction.reset();
      dancer.idleAction.enabled = true;
      dancer.idleAction.setEffectiveWeight(0);
      dancer.idleAction.play();
    }

    dancer.blend = 1;
    dancer.enabled = true;
    dancer.mixer.setTime(0);

  }

}

function createP1(
  x
){

  const template =
    getCharacterTemplate('p1');

  const object =
    SkeletonUtils.clone(
      template
    );

  object.traverse(
    child => {

      if(child.isMesh){

        child.castShadow = true;
        child.receiveShadow = true;

      }

    }
  );

  prepareCharacterMaterials(
    object,
    'p1',
    {
      preserveSkin:
        selectedSong === 'thriller'
    }
  );

  placeModel(
    object,
    x,
    175
  );

  scene.add(object);

  dancers.p1 =
    attachDance(
      object,
      template,
      'p1'
    );

  contactShadowP1 =
    createContactShadow(x);

  applyStageLook(selectedSong);

}

function createP2(
  x
){

  const template =
    getCharacterTemplate('p2');

  const object =
    SkeletonUtils.clone(
      template
    );

  object.traverse(
    child => {

      if(!child.isMesh){
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;

    }
  );

  prepareCharacterMaterials(
    object,
    'p2',
    {
      preserveSkin:
        selectedSong === 'thriller'
    }
  );

  placeModel(
    object,
    x,
    175
  );

  scene.add(object);

  dancers.p2 =
    attachDance(
      object,
      template,
      'p2'
    );

  contactShadowP2 =
    createContactShadow(x);

  applyStageLook(selectedSong);

}

function resetSceneDancers(){

  for(
    const dancer
    of Object.values(dancers)
  ){

    if(dancer?.object){
      scene.remove(dancer.object);
    }

    if(dancer?.driver){
      scene.remove(dancer.driver);
    }

  }

  dancers = {
    p1: null,
    p2: null
  };

  if(contactShadowP1){
    scene.remove(contactShadowP1);
    contactShadowP1.geometry.dispose();
    contactShadowP1.material.dispose();
    contactShadowP1 = null;
  }

  if(contactShadowP2){
    scene.remove(contactShadowP2);
    contactShadowP2.geometry.dispose();
    contactShadowP2.material.dispose();
    contactShadowP2 = null;
  }

}


Object.assign(globalThis, {
  loadSongDance,
  placeModel,
  retargetMixamoMotionClip,
  prepareExternalAnimations,
  getDanceClips,
  getCharacterMotionSet,
  getCharacterTemplate,
  attachDance,
  startPreMatchAnimation,
  startPreMatchAnimations,
  updatePreMatchAnimations,
  beginDanceAnimations,
  createP1,
  createP2,
  resetSceneDancers
});
