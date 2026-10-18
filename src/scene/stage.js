import '../core/state.js';

function getStageBackgroundVideoUrl(song){

  return song?.backgroundVideo || null;

}

function setStageBackgroundVideoPlaybackRate(rate = 1){

  if(!stageBackgroundVideo){
    return;
  }

  const safeRate = THREE.MathUtils.clamp(Number(rate) || 1, .1, 4);
  stageBackgroundVideo.playbackRate = safeRate;
  stageBackgroundVideo.defaultPlaybackRate = safeRate;

}

function setStageBackgroundVideo(song){

  if(!stageBackgroundVideo){
    return false;
  }

  const videoUrl = getStageBackgroundVideoUrl(song);

  if(!videoUrl){
    stageBackgroundVideo.classList.remove('active');
    try{ stageBackgroundVideo.pause(); }catch(error){}
    stageBackgroundVideo.removeAttribute('src');
    stageBackgroundVideo.load();
    return false;
  }

  const currentSrc = stageBackgroundVideo.getAttribute('src');
  const sourceChanged = currentSrc !== videoUrl;

  if(sourceChanged){
    try{ stageBackgroundVideo.pause(); }catch(error){}
    stageBackgroundVideo.src = videoUrl;
    stageBackgroundVideo.poster = song?.background || '';
    stageBackgroundVideo.load();
    try{ stageBackgroundVideo.currentTime = 0; }catch(error){}
  }

  stageBackgroundVideo.muted = true;
  stageBackgroundVideo.loop = true;
  stageBackgroundVideo.playsInline = true;
  setStageBackgroundVideoPlaybackRate(
    document.body.classList.contains('wasted-sequence') ? .32 : 1
  );

  stageBackgroundVideo.classList.add('active');

  try{
    stageBackgroundVideo.play().catch(() => {});
  }catch(error){}

  return true;

}

function applyStageBackground(song){

  const game = document.querySelector('#game');

  if(!game || !song){
    return;
  }

  /*
    Cada música controla seu próprio vídeo. A imagem estática fica como
    fallback atrás do vídeo enquanto ele carrega ou caso o browser não
    consiga reproduzi-lo.
  */
  game.style.backgroundImage = song.background
    ? `url("${song.background}")`
    : 'none';

  setStageBackgroundVideo(song);

}

function applyStageLook(id){

  const look =
    STAGE_LOOKS[id];

  /*
    selectSong() roda antes de init3D() na inicialização.
    Por isso esta função é segura quando as luzes ainda não existem.
  */
  if(!look || !scene){
    return;
  }

  if(hemiLight){
    hemiLight.color.setHex(look.hemiSky);
    hemiLight.groundColor.setHex(look.hemiGround);
    hemiLight.intensity = look.hemiIntensity;
  }

  if(keyLight){
    keyLight.color.setHex(look.keyColor);
    keyLight.intensity = look.keyIntensity;
    keyLight.position.set(...look.keyPos);
  }

  if(fillLight){
    fillLight.color.setHex(look.fillColor);
    fillLight.intensity = look.fillIntensity;
    fillLight.position.set(...look.fillPos);
  }

  if(rimLight){
    rimLight.color.setHex(look.rimColor);
    rimLight.intensity = look.rimIntensity;
    rimLight.position.set(...look.rimPos);
  }

  /*
    Luz frontal de legibilidade: garante que os personagens permaneçam
    visíveis mesmo em cenários escuros, sem apagar a cor da fase.
  */
  if(frontLight){
    frontLight.color.setHex(look.frontColor);
    frontLight.intensity = look.frontIntensity;
    frontLight.position.set(...look.frontPos);
  }

  if(ambientLight){
    ambientLight.intensity = look.ambientIntensity;
  }

  if(renderer){
    renderer.toneMappingExposure = look.exposure;
  }

  scene.fog =
    new THREE.FogExp2(
      look.fogColor,
      look.fogDensity
    );

  updateCharacterStageMaterials(look);
  updateContactShadows(look);

}

function rememberMaterialBase(material){

  if(!material?.color){
    return;
  }

  if(!material.userData.stageBaseColor){
    material.userData.stageBaseColor =
      material.color.clone();
  }

  if(
    material.emissive &&
    !material.userData.stageBaseEmissive
  ){
    material.userData.stageBaseEmissive =
      material.emissive.clone();
  }

  if(
    'emissiveIntensity' in material &&
    material.userData.stageBaseEmissiveIntensity == null
  ){
    material.userData.stageBaseEmissiveIntensity =
      material.emissiveIntensity ?? 0;
  }

}

function prepareCharacterMaterials(
  object,
  player,
  options = {}
){

  const preserveSkin =
    Boolean(options.preserveSkin);

  const accent =
    new THREE.Color(
      player === 'p2'
        ? 0xff425d
        : 0x68c8ff
    );

  /*
    No personagem padrão, a coloração ajuda a distinguir P1/P2.
    Nas skins do Thriller preservamos as texturas originais do personagem e
    deixamos a identidade visual vir da iluminação da própria fase.
  */
  const identityStrength =
    preserveSkin
      ? 0
      : player === 'p2'
        ? 0.36
        : 0.10;

  object.traverse(
    child => {

      if(!child.isMesh || !child.material){
        return;
      }

      const source =
        Array.isArray(child.material)
          ? child.material
          : [child.material];

      const cloned =
        source.map(
          original => {

            const material =
              original.clone();

            const isMichaelMaterial =
              Boolean(
                material.userData
                  ?.michaelThrillerMaterial
              );

            if(isMichaelMaterial){
              /*
                Segurança extra: clones do material nunca podem reativar o
                alpha importado pelo FBX. Luz, sombra e textura continuam
                normais; somente a transparência indevida é descartada.
              */
              material.transparent = false;
              material.opacity = 1;
              material.alphaMap = null;
              material.alphaTest = 0;
              material.depthWrite = true;
              material.depthTest = true;
              material.premultipliedAlpha = false;
              material.blending = THREE.NormalBlending;

              if('transmission' in material){
                material.transmission = 0;
              }

              if(material.color){
                material.color.set(0xffffff);
              }

              material.needsUpdate = true;
            }

            if(material.color){
              material.color.lerp(
                accent,
                identityStrength
              );
            }

            /*
              Materiais menos espelhados recebem melhor as luzes coloridas
              da fase e parecem menos "plástico puro".
            */
            if(material.map){
              /* Texturas de cor importadas por FBX devem ser tratadas em sRGB. */
              material.map.colorSpace = THREE.SRGBColorSpace;

              if(renderer){
                material.map.anisotropy =
                  Math.min(
                    8,
                    renderer.capabilities.getMaxAnisotropy()
                  );
              }

              material.map.needsUpdate = true;
            }

            if('roughness' in material){
              material.roughness =
                Math.max(
                  material.roughness ?? 0.5,
                  preserveSkin ? 0.66 : 0.58
                );
            }

            if('metalness' in material){
              material.metalness =
                Math.min(
                  material.metalness ?? 0,
                  preserveSkin ? 0.08 : 0.18
                );
            }

            if(
              material.emissive &&
              'emissiveIntensity' in material
            ){

              if(!preserveSkin){
                material.emissive.copy(accent);
              }

              material.emissiveIntensity =
                preserveSkin
                  ? Math.min(
                      material.emissiveIntensity ?? 0,
                      0.018
                    )
                  : player === 'p2'
                    ? 0.035
                    : 0.020;
            }

            /*
              As skins Thriller recebem um pouco mais da cor da iluminação,
              mas sem destruir a textura original do personagem.
            */
            material.userData.stageTintMultiplier =
              isMichaelMaterial
                ? 0.52
                : preserveSkin
                  ? 1.20
                  : 1;

            material.userData.stageGlowMultiplier =
              isMichaelMaterial
                ? 0.46
                : preserveSkin
                  ? 0.72
                  : 1;

            rememberMaterialBase(material);

            return material;

          }
        );

      child.material =
        Array.isArray(child.material)
          ? cloned
          : cloned[0];

    }
  );

}

function updateCharacterStageMaterials(look){

  if(!look){
    return;
  }

  const stageTint =
    new THREE.Color(
      look.materialTint
    );

  for(
    const dancer
    of Object.values(dancers)
  ){

    const object = dancer?.object;

    if(!object){
      continue;
    }

    object.traverse(
      child => {

        if(!child.isMesh || !child.material){
          return;
        }

        const materials =
          Array.isArray(child.material)
            ? child.material
            : [child.material];

        for(const material of materials){

          rememberMaterialBase(material);

          if(
            material.color &&
            material.userData.stageBaseColor
          ){
            material.color
              .copy(
                material.userData.stageBaseColor
              )
              .lerp(
                stageTint,
                Math.min(
                  0.20,
                  look.materialTintStrength *
                    (material.userData.stageTintMultiplier ?? 1)
                )
              );
          }

          if(
            material.emissive &&
            'emissiveIntensity' in material
          ){
            const baseEmissive =
              material.userData.stageBaseEmissive;

            if(baseEmissive){
              material.emissive
                .copy(baseEmissive)
                .lerp(
                  stageTint,
                  0.28
                );
            }else{
              material.emissive.copy(stageTint);
            }

            const baseIntensity =
              material.userData.stageBaseEmissiveIntensity ?? 0;

            material.emissiveIntensity =
              Math.max(
                baseIntensity,
                look.materialGlow *
                  (material.userData.stageGlowMultiplier ?? 1)
              );
          }

          material.needsUpdate = true;

        }

      }
    );

  }

}

function getContactShadowTexture(){

  if(contactShadowTexture){
    return contactShadowTexture;
  }

  const canvas =
    document.createElement('canvas');

  canvas.width = 256;
  canvas.height = 128;

  const ctx =
    canvas.getContext('2d');

  const gradient =
    ctx.createRadialGradient(
      128,
      64,
      4,
      128,
      64,
      112
    );

  gradient.addColorStop(
    0,
    'rgba(0,0,0,0.80)'
  );

  gradient.addColorStop(
    0.42,
    'rgba(0,0,0,0.48)'
  );

  gradient.addColorStop(
    1,
    'rgba(0,0,0,0)'
  );

  ctx.fillStyle = gradient;
  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  contactShadowTexture =
    new THREE.CanvasTexture(canvas);

  contactShadowTexture.colorSpace =
    THREE.SRGBColorSpace;

  return contactShadowTexture;

}

function createContactShadow(x){

  const shadow =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        118,
        60
      ),
      new THREE.MeshBasicMaterial({
        map: getContactShadowTexture(),
        color: 0x000000,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );

  shadow.rotation.x =
    -Math.PI / 2;

  shadow.position.set(
    x,
    0.12,
    8
  );

  shadow.renderOrder = -1;

  scene.add(shadow);

  return shadow;

}

function updateContactShadows(look){

  for(
    const shadow
    of [
      contactShadowP1,
      contactShadowP2
    ]
  ){
    if(shadow?.material){
      shadow.material.opacity =
        look.contactShadowOpacity;
    }
  }

}

function init3D(){

  scene =
    new THREE.Scene();

  scene.background = null;

  scene.fog =
    new THREE.Fog(
      0x101419,
      480,
      1100
    );

  camera =
    new THREE.PerspectiveCamera(
      38,
      innerWidth / innerHeight,
      1,
      2000
    );

  camera.position.set(
    0,
    155,
    430
  );

  camera.lookAt(
    0,
    105,
    0
  );

  /*
    Luzes reutilizáveis: as cores e intensidades são trocadas
    por applyStageLook() para cada música.
  */
  hemiLight =
    new THREE.HemisphereLight(
      0xffffff,
      0x202020,
      1.5
    );

  scene.add(hemiLight);

  keyLight =
    new THREE.DirectionalLight(
      0xffffff,
      2.5
    );

  keyLight.position.set(
    120,
    220,
    180
  );

  keyLight.castShadow = true;

  scene.add(keyLight);

  fillLight =
    new THREE.DirectionalLight(
      0xffffff,
      1.2
    );

  fillLight.position.set(
    -130,
    120,
    145
  );

  scene.add(fillLight);

  rimLight =
    new THREE.DirectionalLight(
      0xffffff,
      1.4
    );

  rimLight.position.set(
    0,
    160,
    -200
  );

  scene.add(rimLight);

  /*
    Luz neutra frontal dedicada aos personagens.
    Ela funciona como uma softbox voltada para a pista e impede
    que o boneco desapareça em fundos muito escuros ou saturados.
  */
  frontLight =
    new THREE.DirectionalLight(
      0xffffff,
      2.0
    );

  frontLight.position.set(
    0,
    185,
    330
  );

  scene.add(frontLight);

  /*
    Pequena luz ambiente neutra para preservar leitura das áreas
    que não recebem diretamente as luzes coloridas da fase.
  */
  ambientLight =
    new THREE.AmbientLight(
      0xffffff,
      0.65
    );

  scene.add(ambientLight);

  const floor =
    new THREE.Mesh(
      new THREE.CircleGeometry(
        330,
        64
      ),
      new THREE.MeshPhongMaterial({
        color: 0x20262b,
        transparent: true,
        opacity: 0
      })
    );

  floor.rotation.x =
    -Math.PI / 2;

  floor.receiveShadow =
    true;

  scene.add(floor);

  ringP1 =
    createRing(
      30,
      0x1686ff
    );

  ringP2 =
    createRing(
      72,
      0xe83048
    );

  /*
    Importante:
    P2 vermelho não existe no chão
    enquanto o jogo estiver em 1 jogador.
  */
  ringP2.visible = false;

  renderer =
    new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

  renderer.setClearColor(
    0x000000,
    0
  );

  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      2
    )
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  renderer.shadowMap.enabled =
    true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  renderer.toneMapping =
    THREE.ACESFilmicToneMapping;

  renderer.toneMappingExposure =
    1.0;

  /* Agora renderer + luzes existem; aplica o look da fase atual. */
  applyStageLook(selectedSong);

  document
    .querySelector('#game')
    .appendChild(
      renderer.domElement
    );

  const loadingManager =
    new THREE.LoadingManager();

  /*
    O FBX Michael foi exportado pelo Blender com a textura apontando para
    uma pasta .fbm usando barra invertida (caminho Windows). No navegador
    normalizamos essa referência para a cópia local que acompanha o jogo.
  */
  loadingManager.setURLModifier(url =>
    url.replace(
      /MJ_THRILLER\.fbm(?:[\\/]|%5C)/gi,
      ''
    )
  );

  const loader =
    new FBXLoader(loadingManager);

  /*
    Pré-carrega as skins exclusivas de Thriller em paralelo. Elas ficam
    intactas como templates e só são clonadas quando essa fase começa.
  */
  for(
    const [playerId, url]
    of Object.entries(THRILLER_CHARACTER_URLS)
  ){

    loader.load(
      url,

      group => {

        if(playerId === 'p1'){
          thrillerMichaelSource = group;
          thrillerCharacterErrors.delete(playerId);
          tryPrepareThrillerMichael();
        }else{
          thrillerModels[playerId] = group;
          thrillerCharacterErrors.delete(playerId);
        }

        updateMenuAvailability();
      },

      undefined,

      error => {

        console.error(
          `Erro ao carregar skin Thriller do ${playerId.toUpperCase()}:`,
          error
        );

        /*
          Skin é visual, nunca pode impedir a partida. Se o rig principal
          já estiver disponível, usamos-o imediatamente como fallback.
        */
        if(baseModel){
          thrillerModels[playerId] = baseModel;
          thrillerCharacterErrors.delete(playerId);
        }else{
          thrillerCharacterErrors.add(playerId);
        }

        updateMenuAvailability();
      }
    );

  }

  loader.load(
    P1_MODEL_URL,

    group => {

      baseModel = group;
      p1Loaded = true;

      /* Resolve qualquer falha visual de skin sem bloquear a fase. */
      for(const playerId of thrillerCharacterErrors){
        if(!thrillerModels[playerId]){
          thrillerModels[playerId] = baseModel;
        }
      }
      thrillerCharacterErrors.clear();

      tryPrepareThrillerMichael();
      prepareExternalAnimations();
      updateMenuAvailability();

    },

    undefined,

    error => {

      console.error(
        'Erro P1:',
        error
      );

      characterError = true;
      updateMenuAvailability();

    }
  );

  loader.load(
    DEFEAT_ANIMATION_URL,

    group => {

      defeatSource = group;
      defeatRawClip =
        group.animations?.[0] || null;

      if(!defeatRawClip){
        defeatAnimationError = true;
        console.warn('Dying.fbx foi carregado, mas não contém animação.');
      }else{
        defeatAnimationError = false;
        prepareExternalAnimations();
      }

      updateMenuAvailability();

    },

    undefined,

    error => {

      defeatAnimationError = true;

      console.error(
        'Erro ao carregar animação de derrota:',
        error
      );

      updateMenuAvailability();

    }
  );

  loader.load(
    VICTORY_ANIMATION_URL,

    group => {

      victorySource = group;
      victoryRawClip =
        group.animations?.[0] || null;

      if(!victoryRawClip){
        victoryAnimationError = true;
        console.warn('Laughing.fbx foi carregado, mas não contém animação.');
      }else{
        victoryAnimationError = false;
        prepareExternalAnimations();
      }

    },

    undefined,

    error => {

      victoryAnimationError = true;

      console.error(
        'Erro ao carregar animação de vitória:',
        error
      );

    }
  );


  loader.load(
    MENU_IDLE_ANIMATION_URL,

    group => {

      menuIdleSource = group;
      menuIdleRawClip = group.animations?.[0] || null;

      if(!menuIdleRawClip){
        menuIdleAnimationError = true;
        console.warn('Zombie Idle.fbx foi carregado, mas não contém animação.');
      }else{
        menuIdleAnimationError = false;
        prepareExternalAnimations();
      }

      updateMenuAvailability();

      if(
        menu.style.display !== 'none' &&
        !menuPreviewState.active &&
        p1Loaded
      ){
        showMenuCharacterWaiting();
      }

    },

    undefined,

    error => {
      menuIdleAnimationError = true;
      console.error('Erro ao carregar animação idle do menu:', error);
      updateMenuAvailability();
    }
  );


  for(
    const [playerId, url]
    of Object.entries(PRE_MATCH_ANIMATION_URLS)
  ){

    loader.load(
      url,

      group => {

        const clip =
          group.animations?.[0] || null;

        if(!clip){
          preMatchAnimationErrors.add(playerId);
          console.warn(
            `A animação de pré-partida do ${playerId.toUpperCase()} não contém clip.`
          );
        }else{
          preMatchSources[playerId] = group;
          preMatchRawClips[playerId] = clip;
          preMatchAnimationErrors.delete(playerId);
          prepareExternalAnimations();
        }

        updateMenuAvailability();

      },

      undefined,

      error => {

        preMatchAnimationErrors.add(playerId);

        console.error(
          `Erro ao carregar animação de pré-partida do ${playerId.toUpperCase()}:`,
          error
        );

        updateMenuAvailability();

      }
    );

  }


  for(
    const [playerId, url]
    of Object.entries(COMPLETION_ANIMATION_URLS)
  ){

    loader.load(
      url,

      group => {

        const clip =
          group.animations?.[0] || null;

        if(!clip){
          completionAnimationErrors.add(playerId);
          console.warn(
            `A animação de comemoração do ${playerId.toUpperCase()} não contém clip.`
          );
        }else{
          completionSources[playerId] = group;
          completionRawClips[playerId] = clip;
          completionAnimationErrors.delete(playerId);
          prepareExternalAnimations();
        }

        updateMenuAvailability();

      },

      undefined,

      error => {

        completionAnimationErrors.add(playerId);

        console.error(
          `Erro ao carregar animação de comemoração do ${playerId.toUpperCase()}:`,
          error
        );

        updateMenuAvailability();

      }
    );

  }


  addEventListener(
    'resize',
    () => {

      camera.aspect =
        innerWidth / innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        innerWidth,
        innerHeight
      );

    }
  );

  renderer.setAnimationLoop(render);

}

function createRing(
  x,
  color
){

  const ring =
    new THREE.Mesh(
      new THREE.RingGeometry(
        62,
        67,
        64
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: .35,
        side: THREE.DoubleSide
      })
    );

  ring.rotation.x =
    -Math.PI / 2;

  ring.position.set(
    x,
    .4,
    0
  );

  scene.add(ring);

  return ring;

}

function render(){

  updateGame();
  updateDefeatSequence();
  updateCompletionSequence();
  updateMenuPreview();
  updateResultCelebration();

  renderer.render(
    scene,
    camera
  );

}


Object.assign(globalThis, {
  applyStageBackground,
  setStageBackgroundVideo,
  setStageBackgroundVideoPlaybackRate,
  applyStageLook,
  rememberMaterialBase,
  prepareCharacterMaterials,
  updateCharacterStageMaterials,
  getContactShadowTexture,
  createContactShadow,
  updateContactShadows,
  init3D,
  createRing,
  render
});
