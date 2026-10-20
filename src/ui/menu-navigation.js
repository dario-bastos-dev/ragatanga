const SONG_ORDER = ['thriller', 'ragatanga', 'macarena', 'ymca'];

export function initMenuNavigation(){
  document.body.classList.add('menu-active');
  const tabs = [...document.querySelectorAll('[data-menu-tab]')];
  function activate(tab){
    for(const item of tabs){
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.querySelector(`#panel-${item.dataset.menuTab}`).hidden = !selected;
    }
  }
  for(const tab of tabs){
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next;
      const index = tabs.indexOf(tab);
      if(event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if(event.key === 'ArrowLeft') next = tabs[(index + tabs.length - 1) % tabs.length];
      if(event.key === 'Home') next = tabs[0];
      if(event.key === 'End') next = tabs.at(-1);
      if(!next) return;
      event.preventDefault();
      activate(next);
      next.focus();
    });
  }
  for(const [selector, direction] of [['.songArrowPrev', -1], ['.songArrowNext', 1]]){
    document.querySelector(selector).addEventListener('click', () => {
      const index = SONG_ORDER.indexOf(globalThis.selectedSong);
      const id = SONG_ORDER[(index + direction + SONG_ORDER.length) % SONG_ORDER.length];
      document.querySelector(`.songCard[data-song="${id}"]`).click();
    });
  }
  for(const [id, field] of [['menuThemeVolume', 'theme'], ['menuPreviewVolume', 'preview']]){
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      const value = Number(input.value) / 100;
      globalThis.menuAudioSettings[field] = value;
      document.getElementById(`${id}Value`).value = `${input.value}%`;
      globalThis.updateMenuAudioVolumes();
    });
  }
  document.querySelector('#closeLeaderboard').addEventListener('click', () => {
    document.querySelector('#openLeaderboard').focus();
  });
}
