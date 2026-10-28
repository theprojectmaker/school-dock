# Saves the two build secrets in theprojectmaker/school-dock:
#   EXPO_TOKEN       - you paste it (expo.dev > Account settings > Access tokens)
#   QUILL_APP_TOKEN  - read from ..\..\quill-study\.app-token on this PC
# Nothing is stored or printed here; each value goes straight to GitHub.
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
$repo = 'theprojectmaker/school-dock'

$secure = Read-Host 'Paste your Expo access token (it will not show) and press Enter' -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ($token) {
  $token | & $gh secret set EXPO_TOKEN --repo $repo
  if ($LASTEXITCODE -eq 0) { Write-Host 'EXPO_TOKEN saved' } else { Write-Host 'EXPO_TOKEN FAILED' }
} else { Write-Host 'No Expo token entered, skipped.' }
$token = $null

$file = Join-Path $PSScriptRoot '..\..\quill-study\.app-token'
if (Test-Path $file) {
  (Get-Content $file -Raw).Trim() | & $gh secret set QUILL_APP_TOKEN --repo $repo
  if ($LASTEXITCODE -eq 0) { Write-Host 'QUILL_APP_TOKEN saved' } else { Write-Host 'QUILL_APP_TOKEN FAILED' }
} else { Write-Host "Can't find $file" }
