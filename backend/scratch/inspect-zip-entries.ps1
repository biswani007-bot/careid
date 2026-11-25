Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("release\careid-backend-aaPanel-staging-v1.0.0.zip")
$srcEntries = $zip.Entries | Where-Object { $_.FullName -like "src/*" }
Write-Host "src/ entries count in ZIP:" $srcEntries.Count
$distEntries = $zip.Entries | Where-Object { $_.FullName -like "dist/*" }
Write-Host "dist/ entries count in ZIP:" $distEntries.Count
$rootEntries = $zip.Entries | Where-Object { -not ($_.FullName.Contains("/")) } | Select-Object -ExpandProperty FullName
Write-Host "Root entries:" ($rootEntries -join ", ")
$zip.Dispose()

