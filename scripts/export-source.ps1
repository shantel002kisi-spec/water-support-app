$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputRoot = Join-Path $projectRoot 'outputs'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path ([IO.Path]::GetTempPath()) ("water-support-source-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
New-Item -ItemType Directory -Path $stage -Force | Out-Null
$sourceFolders = @('app','build','components','db','docs','drizzle','examples','hooks','lib','scripts','tests','types','vendor','.github')
foreach ($folder in $sourceFolders) {
  $source = Join-Path $projectRoot $folder
  if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $stage -Recurse }
}
New-Item -ItemType Directory -Path (Join-Path $stage 'public') -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'public') -File | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $stage 'public') }
$rootFiles = @('.gitignore','.npmrc','cloudflare-env.d.ts','components.json','drizzle.config.ts','eslint.config.mjs','next.config.ts','package-lock.json','package.json','postcss.config.mjs','README.md','Start Water Support.cmd','tsconfig.json','vite.config.ts')
foreach ($file in $rootFiles) { Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $stage }
$archive = Join-Path $outputRoot "water-support-source-$stamp.zip"
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive
Write-Output "Source archive: $archive"
