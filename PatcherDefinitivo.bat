@echo off
title Vencord Offline Patcher Definitivo
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\PatcherDefinitivo.ps1"
pause
