// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  describe,
  it,
  expect,
  vi,
  beforeAll
} from 'vitest';

/* Simula o download do personagem falhando (ex.: sem internet). */
vi.mock('three/addons/loaders/FBXLoader.js', () => ({
  FBXLoader: class {
    load(url, onLoad, onProgress, onError){
      onError(new Error('rede indisponível'));
    }
  }
}));

let menu;
let character;

beforeAll(async () => {

  const html =
    readFileSync(
      resolve(process.cwd(), 'index.html'),
      'utf8'
    );

  /* innerHTML não executa os <script>, só monta o DOM do jogo. */
  document.documentElement.innerHTML =
    html.replace(/<!doctype html>/i, '');

  /* jsdom não implementa carregamento de mídia. */
  HTMLMediaElement.prototype.load = () => {};

  vi.spyOn(console, 'error').mockImplementation(() => {});

  /* Os módulos leem o DOM ao serem importados. */
  menu = await import('./menu.js');
  character = await import('../scene/character.js');

  menu.initMenu({ onStart: () => {} });

});

describe('menu quando o personagem 3D não carrega', () => {

  it('mantém o aviso de erro mesmo depois de outras atualizações do menu', () => {

    character.loadCharacter(
      menu.updateMenuAvailability,
      menu.updateMenuAvailability
    );

    /* Ex.: a música termina de carregar depois da falha do personagem. */
    menu.updateMenuAvailability();

    expect(
      document.querySelector('#menuStatus').textContent
    ).toBe('Não foi possível carregar o P1.');

  });

  it('mantém os botões de jogar desabilitados', () => {

    menu.updateMenuAvailability();

    expect(document.querySelector('#onePlayer').disabled).toBe(true);
    expect(document.querySelector('#twoPlayers').disabled).toBe(true);

  });

});
