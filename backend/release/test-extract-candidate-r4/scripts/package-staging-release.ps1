$ErrorActionPreference = "Stop"

$workspaceRoot = "c:\Users\PABANI\Downloads\hvapi-main\hvapi-main"
$updateScript = Join-Path $workspaceRoot "scripts\update-staging-release.js"

Write-Host "Running CareID Staging Release Packaging Engine..."
node $updateScript


