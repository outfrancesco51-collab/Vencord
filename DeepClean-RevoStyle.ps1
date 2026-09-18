# ==============================================================================
# Vencord Deep Clean Tool (Revo Uninstaller Style)
# Elimina ogni traccia, file corrotto, cache Electron e hook obsoleto di Vencord e Discord.
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Red
Write-Host "       VENCORD DEEP CLEAN (REVO UNINSTALLER STYLE)         " -ForegroundColor Red
Write-Host "==========================================================" -ForegroundColor Red

# 1. Arresta processi
Write-Host "`n[1/5] Chiusura forzata processi Discord..." -ForegroundColor Yellow
Get-Process -Name "Discord*", "Update" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
Write-Host "  -> Processi terminati." -ForegroundColor Green

# 2. Pulizia cartelle Discord e ripristino asar pulito
Write-Host "`n[2/5] Ripristino e pulizia installazioni Discord (Local AppData)..." -ForegroundColor Yellow
$variants = @("Discord", "DiscordPTB", "DiscordCanary")
foreach ($variant in $variants) {
    $basePath = Join-Path $env:LOCALAPPDATA $variant
    if (Test-Path $basePath) {
        Get-ChildItem -Path $basePath -Filter "app-*" -Directory | ForEach-Object {
            $res = Join-Path $_.FullName "resources"
            if (Test-Path $res) {
                $appAsar = Join-Path $res "app.asar"
                $backup = Join-Path $res "_app.asar"
                if (Test-Path $backup) {
                    Write-Host "  -> Trovato backup originale: ripristino app.asar pulito in $($_.Name)..." -ForegroundColor Cyan
                    Remove-Item $appAsar -Force -ErrorAction SilentlyContinue
                    Move-Item $backup $appAsar -Force -ErrorAction SilentlyContinue
                }
            }
            # Ripristina anche discord_desktop_core index.js se modificato
            $coreIndex = Join-Path $_.FullName "modules\discord_desktop_core-*\discord_desktop_core\index.js"
            Get-Item $coreIndex -ErrorAction SilentlyContinue | ForEach-Object {
                Set-Content -Path $_.FullName -Value "module.exports = require('./core.asar');" -Encoding UTF8
                Write-Host "  -> Ripristinato core index.js vanilla in $($_.FullName)" -ForegroundColor Gray
            }
        }
    }
}

# 3. Pulizia Cache Electron (Cache, Code Cache, GPUCache)
Write-Host "`n[3/5] Pulizia Cache pesante Electron (risolve crash e file corrotti)..." -ForegroundColor Yellow
foreach ($variant in @("discord", "discordptb", "discordcanary")) {
    $roamingDiscord = Join-Path $env:APPDATA $variant
    if (Test-Path $roamingDiscord) {
        $cacheDirs = @("Cache", "Code Cache", "GPUCache", "DawnCache")
        foreach ($cd in $cacheDirs) {
            $target = Join-Path $roamingDiscord $cd
            if (Test-Path $target) {
                Remove-Item -Path $target -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "  -> Svuotata cartella: $cd ($variant)" -ForegroundColor Gray
            }
        }
    }
}

# 4. Pulizia tracce obsolete in Roaming Vencord
Write-Host "`n[4/5] Pulizia file temporanei di Vencord..." -ForegroundColor Yellow
$roamingVencord = Join-Path $env:APPDATA "Vencord"
if (Test-Path $roamingVencord) {
    Remove-Item (Join-Path $roamingVencord "dist") -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  -> Rimossa vecchia cache di Vencord." -ForegroundColor Green
}

# 5. Riapplica l'installazione moderna pulita
Write-Host "`n[5/5] Re-installazione pulita e moderna di Vencord..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "PatcherDefinitivo.ps1") -NoPause

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  PULIZIA PROFONDA COMPLETATA CON SUCCESSO!                 " -ForegroundColor Green
Write-Host "  Ogni conflitto, cache corrotta e vecchio hook e' rimosso. " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "`nOra puoi riavviare Discord pulito al 100%!" -ForegroundColor Cyan

