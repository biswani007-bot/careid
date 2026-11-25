$original = 'C:\Users\PABANI\Downloads\hvapi-main\hvapi-main - Copy'
$current = 'C:\Users\PABANI\Downloads\hvapi-main\hvapi-main'

$origFiles = Get-ChildItem -Recurse -File $original | ForEach-Object { $_.FullName.Substring($original.Length + 1) }
$currFiles = Get-ChildItem -Recurse -File $current | Where-Object { $_.FullName -notmatch '\\(dist|node_modules|\.git|data)\\' } | ForEach-Object { $_.FullName.Substring($current.Length + 1) }

Write-Host '=== CREATED FILES ==='
$currFiles | Where-Object { $_ -notin $origFiles } | ForEach-Object { Write-Host "CREATED: $_" }

Write-Host '=== MODIFIED FILES ==='
$currFiles | Where-Object { $_ -in $origFiles } | ForEach-Object {
    $cPath = Join-Path $current $_
    $oPath = Join-Path $original $_
    if ((Get-FileHash $cPath).Hash -ne (Get-FileHash $oPath).Hash) {
        Write-Host "MODIFIED: $_"
    }
}

