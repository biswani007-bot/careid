Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("release\careid-backend-aaPanel-staging-v1.0.0.zip")
$authEntry = $zip.Entries | Where-Object { $_.FullName -like "*auth.controller.js" }
Write-Host "Auth controller entry found:" $authEntry.FullName
$stream = $authEntry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$stream.Close()
$zip.Dispose()

$hasPasswordLogin = $content.Contains("password/login")
$hasAdminLogin = $content.Contains("admin/login")
$hasPasswordLoginFunc = $content.Contains("passwordLogin")

Write-Host "Contains password/login:" $hasPasswordLogin
Write-Host "Contains admin/login:" $hasAdminLogin
Write-Host "Contains passwordLogin:" $hasPasswordLoginFunc

