$ErrorActionPreference = 'Stop'
$toolsDirectory = Join-Path $PSScriptRoot '..\.tools'
New-Item -ItemType Directory -Path $toolsDirectory -Force | Out-Null
$release = Invoke-RestMethod 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
$binaryAsset = $release.assets | Where-Object name -eq 'yt-dlp.exe' | Select-Object -First 1
$hashAsset = $release.assets | Where-Object name -eq 'SHA2-256SUMS' | Select-Object -First 1
if (-not $binaryAsset -or -not $hashAsset) { throw 'A versão oficial não disponibilizou executável e checksum.' }
$destination = Join-Path $toolsDirectory 'yt-dlp.exe'
$download = Join-Path $toolsDirectory 'yt-dlp.download'
Invoke-WebRequest $binaryAsset.browser_download_url -OutFile $download -UseBasicParsing
$checksums = (Invoke-WebRequest $hashAsset.browser_download_url -UseBasicParsing).Content
if ($checksums -is [byte[]]) { $checksums = [System.Text.Encoding]::UTF8.GetString($checksums) }
$expected = (($checksums -split "`n" | Where-Object { $_ -match '\s+\*?yt-dlp\.exe\s*$' }) -split '\s+')[0]
$actual = (Get-FileHash -LiteralPath $download -Algorithm SHA256).Hash
if (-not $expected -or $actual -ne $expected) { throw 'O checksum do yt-dlp não corresponde ao publicado.' }
Move-Item -LiteralPath $download -Destination $destination -Force
Write-Output "yt-dlp $($release.tag_name) instalado no projeto e SHA-256 verificado."
