import '../core/state.js';

export function initControls(){
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
    stopMenuPreview();
    startMode(menuSelectedMode);
  };

  document.querySelector('#backMenu').onclick = () => returnToMenu();
  retryFromResultsButton.onclick = () => retryCurrentMode();
  chooseMusicFromResultsButton.onclick = () => returnToMenu();
  pauseButton.onclick = () => pauseGame();
  continueGameButton.onclick = () => resumeGame();
  pauseBackMenuButton.onclick = () => returnToMenu();
  defeatRetryButton.onclick = () => retryCurrentMode();
  defeatBackMenuButton.onclick = () => returnToMenu();
}
