@echo off
title Vencord Deep Clean (Revo Uninstaller Style)
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\DeepClean-RevoStyle.ps1"
pause
