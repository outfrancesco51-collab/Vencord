# Patcher Definitivo per Vencord Offline
# Ignora GitHub e la rete, forza l'inserimento di Vencord direttamente nel core di Discord.

$VencordPath = "$PSScriptRoot\dist\patcher.js"
if (-not (Test-Path $VencordPath)) {
    Write-Host "ERRORE: dist\patcher.js non trovato! Assicurati di aver compilato Vencord o estratto lo ZIP." -ForegroundColor Red
    Pause
    exit
}

$VencordPathEscaped = $VencordPath -replace '\\', '\\'
$InjectString = "require(`"$VencordPathEscaped`");`nmodule.exports = require('./core.asar');"

$FoundAny = $false
$Variants = @("Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment")

Write-Host "=== Vencord Offline Patcher Definitivo ===" -ForegroundColor Cyan
Write-Host "Cerco le installazioni di Discord..."

foreach ($Variant in $Variants) {
    $VariantPath = Join-Path $env:LOCALAPPDATA $Variant
    if (Test-Path $VariantPath) {
        # Trova la cartella app- più recente
        $AppDirs = Get-ChildItem -Path $VariantPath -Filter "app-*" -Directory | Sort-Object Name -Descending
        if ($AppDirs.Count -gt 0) {
            $LatestAppDir = $AppDirs[0].FullName
            $CoreModulePath = Join-Path $LatestAppDir "modules"
            
            # Trova la cartella discord_desktop_core-*
            if (Test-Path $CoreModulePath) {
                $CoreDirs = Get-ChildItem -Path $CoreModulePath -Filter "discord_desktop_core-*" -Directory | Sort-Object Name -Descending
                if ($CoreDirs.Count -gt 0) {
                    $LatestCoreDir = $CoreDirs[0].FullName
                    $IndexJsPath = Join-Path $LatestCoreDir "discord_desktop_core\index.js"
                    
                    if (Test-Path $IndexJsPath) {
                        $FoundAny = $true
                        $CurrentContent = Get-Content $IndexJsPath -Raw
                        
                        if ($CurrentContent -match "patcher\.js") {
                            Write-Host "[~] $Variant è già patchato!" -ForegroundColor Yellow
                        } else {
                            Set-Content -Path $IndexJsPath -Value $InjectString -Encoding UTF8
                            Write-Host "[+] $Variant patchato con SUCCESSO!" -ForegroundColor Green
                        }
                    }
                }
            }
        }
    }
}

if (-not $FoundAny) {
    Write-Host "Nessuna installazione di Discord trovata." -ForegroundColor Red
} else {
    Write-Host "Chiusura di Discord in corso..."
    Stop-Process -Name "Discord" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "DiscordPTB" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "DiscordCanary" -Force -ErrorAction SilentlyContinue
    Stop-Process -Name "DiscordDevelopment" -Force -ErrorAction SilentlyContinue
    Write-Host "Avvia di nuovo Discord e Vencord sarà attivo!" -ForegroundColor Cyan
}

Write-Host "`nPremi un tasto per uscire..."
[System.Console]::ReadKey() | Out-Null
