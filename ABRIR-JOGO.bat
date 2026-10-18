@echo off
setlocal
cd /d "%~dp0"
title You Dance v2.17 - Servidor Portatil

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo.
  echo ERRO: O Windows PowerShell nao foi encontrado neste computador.
  echo.
  pause
  exit /b 1
)

echo ===============================================
echo   YOU DANCE v2.17 - MODO PORTATIL
echo ===============================================
echo.
echo Nao precisa instalar Node.js nem executar npm.
echo O navegador sera aberto automaticamente.
echo.
echo Para encerrar o jogo/servidor, feche esta janela.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor-portatil.ps1"

if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o modo portatil.
  echo Veja a mensagem acima para identificar o bloqueio.
  echo.
  pause
)
endlocal
