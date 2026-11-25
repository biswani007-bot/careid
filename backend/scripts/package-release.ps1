$ErrorActionPreference = "Stop"

$workspaceRoot = "c:\Users\PABANI\Downloads\hvapi-main\hvapi-main"
$releaseDir = Join-Path $workspaceRoot "release\careid-backend-staging-v1.0.0"
$zipPath = Join-Path $workspaceRoot "release\careid-backend-aaPanel-staging-v1.0.0.zip"

Write-Host "Cleaning up prior release staging directories..."
if (Test-Path $releaseDir) { Remove-Item -Recurse -Force $releaseDir }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

Write-Host "Creating target release directory structure..."
New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseDir "prisma") -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseDir "scripts") -Force | Out-Null

Write-Host "Copying compiled application assets and configuration..."
Copy-Item -Recurse (Join-Path $workspaceRoot "dist") (Join-Path $releaseDir "dist")
Copy-Item (Join-Path $workspaceRoot "prisma\schema.prisma") (Join-Path $releaseDir "prisma\schema.prisma")
Copy-Item (Join-Path $workspaceRoot "prisma\baseline_schema.sql") (Join-Path $releaseDir "prisma\baseline_schema.sql")
if (Test-Path (Join-Path $workspaceRoot "prisma\migrations_offline")) {
  Copy-Item -Recurse (Join-Path $workspaceRoot "prisma\migrations_offline") (Join-Path $releaseDir "prisma\migrations_offline")
}
Copy-Item (Join-Path $workspaceRoot "prisma.config.ts") (Join-Path $releaseDir "prisma.config.ts")

Copy-Item (Join-Path $workspaceRoot "scripts\deploy-preflight.js") (Join-Path $releaseDir "scripts\deploy-preflight.js")
Copy-Item (Join-Path $workspaceRoot "scripts\server-healthcheck.js") (Join-Path $releaseDir "scripts\server-healthcheck.js")
Copy-Item (Join-Path $workspaceRoot "scripts\seed-staging.js") (Join-Path $releaseDir "scripts\seed-staging.js")
Copy-Item (Join-Path $workspaceRoot "scripts\seed-local.js") (Join-Path $releaseDir "scripts\seed-local.js")

Copy-Item (Join-Path $workspaceRoot "ecosystem.config.js") (Join-Path $releaseDir "ecosystem.config.js")
Copy-Item (Join-Path $workspaceRoot ".env.staging.example") (Join-Path $releaseDir ".env.staging.example")
Copy-Item (Join-Path $workspaceRoot "package.json") (Join-Path $releaseDir "package.json")
Copy-Item (Join-Path $workspaceRoot "package-lock.json") (Join-Path $releaseDir "package-lock.json")
Copy-Item (Join-Path $workspaceRoot "README-AAPANEL-DEPLOYMENT.md") (Join-Path $releaseDir "README-AAPANEL-DEPLOYMENT.md")
Copy-Item (Join-Path $workspaceRoot "RELEASE-MANIFEST.json") (Join-Path $releaseDir "RELEASE-MANIFEST.json")

Write-Host "Creating deployment ZIP archive..."
Compress-Archive -Path "$releaseDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

$zipInfo = Get-Item $zipPath
$zipSizeMb = [math]::Round($zipInfo.Length / 1MB, 2)
Write-Host "SUCCESS: Deployment ZIP package created at:"
Write-Host $zipInfo.FullName
Write-Host "Archive File Size: $zipSizeMb MB"
