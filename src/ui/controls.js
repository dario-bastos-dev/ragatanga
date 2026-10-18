import '../core/state.js';

export function initControls(){
  /*
    Som 1 do pacote GTA: feedback para qualquer opção do menu principal,
    exceto o botão INICIAR DANÇA (que possui um efeito próprio).
  */
  menu.addEventListener(
    'click',
    event => {
      const button = event.target.closest('button');
      if(
        !button ||
        button === startGameButton ||
        !menu.contains(button)
      ){
        return;
      }
      playMenuSelectSound();
    }
  );

  const addOverlayMenuSound = overlay => {
    overlay?.addEventListener(
      'click',
      event => {
        const button = event.target.closest('button');
        if(!button || !overlay.contains(button)){
          return;
        }
        playMenuSelectSound();
      },
      true
    );
  };

  addOverlayMenuSound(pauseOverlay);
  addOverlayMenuSound(resultOverlay);

  document.querySelector('#onePlayer').onclick = () => {
    menuSelectedMode = 1;
    updateModeButtons();
  };

  document.querySelector('#twoPlayers').onclick = () => {
    menuSelectedMode = 2;
    updateModeButtons();
  };

  startGameButton.onclick = () => {
    if(startGameButton.disabled) return;
    playStartDanceSound();
    stopMenuPreview();
    startMode(menuSelectedMode);
  };

  document.querySelector('#backMenu').onclick = () => returnToMenu();
  retryFromResultsButton.onclick = () => retryCurrentMode();
  chooseMusicFromResultsButton.onclick = () => returnToMenu();
  pauseButton.onclick = () => {
    playPauseSound();
    pauseGame();
  };
  continueGameButton.onclick = () => resumeGame();
  pauseBackMenuButton.onclick = () => returnToMenu();
  defeatRetryButton.onclick = () => retryCurrentMode();
  defeatBackMenuButton.onclick = () => returnToMenu();
}
