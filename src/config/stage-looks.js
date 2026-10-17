export const STAGE_LOOKS = {
  ragatanga: {
    exposure: 1.14,
    hemiSky: 0x6b5cff,
    hemiGround: 0x2b1730,
    hemiIntensity: 1.65,

    keyColor: 0xffa24a,
    keyIntensity: 2.75,
    keyPos: [135, 215, 175],

    fillColor: 0x33d8ff,
    fillIntensity: 1.45,
    fillPos: [-150, 125, 145],

    rimColor: 0xff43d1,
    rimIntensity: 2.10,
    rimPos: [0, 170, -210],

    frontColor: 0xfff1de,
    frontIntensity: 2.20,
    frontPos: [0, 185, 330],
    ambientIntensity: 0.70,

    materialTint: 0xff86d8,
    materialTintStrength: 0.055,
    materialGlow: 0.060,

    fogColor: 0x42163d,
    fogDensity: 0.00040,
    contactShadowOpacity: 0.22
  },

  thriller: {
    /*
      Thriller é propositalmente frio/escuro, mas com luz frontal suficiente
      para preservar rosto, roupa e silhueta das duas skins da fase.
    */
    exposure: 1.04,
    hemiSky: 0x6f83b8,
    hemiGround: 0x0b1512,
    hemiIntensity: 1.34,

    keyColor: 0x90adff,
    keyIntensity: 2.48,
    keyPos: [-125, 230, 160],

    fillColor: 0xc942a7,
    fillIntensity: 1.08,
    fillPos: [145, 105, 135],

    rimColor: 0x64ffb0,
    rimIntensity: 1.92,
    rimPos: [0, 155, -205],

    frontColor: 0xe8efff,
    frontIntensity: 2.55,
    frontPos: [0, 185, 330],
    ambientIntensity: 0.72,

    materialTint: 0x8497bd,
    materialTintStrength: 0.095,
    materialGlow: 0.045,

    fogColor: 0x32132e,
    fogDensity: 0.00060,
    contactShadowOpacity: 0.38
  },

  macarena: {
    exposure: 1.16,
    hemiSky: 0xffb86b,
    hemiGround: 0x3d2618,
    hemiIntensity: 1.72,

    keyColor: 0xff9f3d,
    keyIntensity: 2.90,
    keyPos: [130, 225, 170],

    fillColor: 0x4bdcff,
    fillIntensity: 1.20,
    fillPos: [-145, 120, 135],

    rimColor: 0xff62c9,
    rimIntensity: 1.35,
    rimPos: [0, 165, -210],

    frontColor: 0xfff0d8,
    frontIntensity: 2.25,
    frontPos: [0, 185, 330],
    ambientIntensity: 0.72,

    materialTint: 0xffb56f,
    materialTintStrength: 0.070,
    materialGlow: 0.060,

    fogColor: 0xd35a4d,
    fogDensity: 0.00030,
    contactShadowOpacity: 0.21
  },

  ymca: {
    exposure: 1.10,
    hemiSky: 0xc154d7,
    hemiGround: 0x211128,
    hemiIntensity: 1.60,

    keyColor: 0x43dbff,
    keyIntensity: 2.40,
    keyPos: [115, 205, 165],

    fillColor: 0xff43ca,
    fillIntensity: 1.55,
    fillPos: [-130, 115, 145],

    rimColor: 0xffbd45,
    rimIntensity: 1.55,
    rimPos: [0, 160, -205],

    frontColor: 0xffeaff,
    frontIntensity: 2.30,
    frontPos: [0, 185, 330],
    ambientIntensity: 0.75,

    materialTint: 0xdb66ff,
    materialTintStrength: 0.075,
    materialGlow: 0.070,

    fogColor: 0x4a1558,
    fogDensity: 0.00042,
    contactShadowOpacity: 0.24
  }
};
