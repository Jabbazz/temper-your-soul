<#
.SYNOPSIS
    Verifica complessiva di Temper your soul: controllo dei tipi, test e build.

.DESCRIPTION
    Esegue `npm run verify` ed esce con codice 0 SOLO se tutto riesce. Se `node` non e' nel PATH cerca una copia
    portatile in `.tools/` del progetto e, in mancanza, quella di Ashen Realm (vedi CLAUDE.md).

.EXAMPLE
    .\tools\verify.ps1
#>
$ErrorActionPreference = "Stop"
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectDir

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $candidates = @(
        (Join-Path $projectDir ".tools\node-v22.11.0-win-x64"),
        "C:\Users\gianm\Documents\ashen-realm\.tools\node-v22.11.0-win-x64"
    )
    $found = $candidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ "node.exe") } | Select-Object -First 1
    if ($null -eq $found) {
        Write-Host "VERIFICA NON ESEGUITA: Node non trovato. Installa Node 22 o aggiungilo al PATH."
        exit 2
    }
    $env:PATH = "$found;$env:PATH"
    Write-Host "Node portatile: $found"
}

if (-not (Test-Path -LiteralPath (Join-Path $projectDir "node_modules"))) {
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Host "VERIFICA FALLITA: npm install"; exit 1 }
}

npm run verify
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "VERIFICA FALLITA (codice $LASTEXITCODE)"
    exit 1
}
Write-Host ""
Write-Host "VERIFICA COMPLETA: OK"
exit 0
