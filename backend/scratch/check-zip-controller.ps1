Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("release\careid-backend-aaPanel-staging-v1.0.0.zip")
$entry = $zip.Entries | Where-Object { $_.FullName -like "*auth.controller.js" }
Write-Host "FullName:" $entry.FullName
Write-Host "LastWriteTime:" $entry.LastWriteTime
Write-Host "Length:" $entry.Length
Write-Host "CompressedLength:" $entry.CompressedLength
$zip.Dispose()

