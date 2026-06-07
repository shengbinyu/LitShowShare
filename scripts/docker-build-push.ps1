<#
.SYNOPSIS
  LitShowShare - Build & Push Docker image to Aliyun ACR (PowerShell)
.DESCRIPTION
  One-click script for Windows devs to build and push.
.PARAMETER EnvFile
  Path to env file (default: .env.docker)
.PARAMETER Tag
  Override image tag
.EXAMPLE
  .\scripts\docker-build-push.ps1
  .\scripts\docker-build-push.ps1 -Tag v1.2.3 -EnvFile .env.prod
#>

param(
  [string]$EnvFile = ".env.docker",
  [string]$Tag = ""
)

$ErrorActionPreference = "Stop"

# ---- Load env file ----
if (Test-Path $EnvFile) {
  Write-Host "[INFO] Loading env file: $EnvFile"
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)\s*$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim()
      Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue
    }
  }
}

# ---- Validate ----
$required = @("IMAGE_REGISTRY", "IMAGE_NAMESPACE", "IMAGE_NAME", "ACR_USERNAME", "ACR_PASSWORD")
foreach ($var in $required) {
  if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
    throw "Required env var `$$var` is not set"
  }
}

# ---- Compute tags ----
$gitSha = & git rev-parse --short HEAD 2>$null
if (-not $gitSha) { $gitSha = "nogit" }

$primaryTag = if ($Tag) { $Tag } else { (Get-Item "env:IMAGE_TAG" -ErrorAction SilentlyContinue).Value }
if (-not $primaryTag) { $primaryTag = "latest" }

$registry = (Get-Item "env:IMAGE_REGISTRY").Value
$ns = (Get-Item "env:IMAGE_NAMESPACE").Value
$name = (Get-Item "env:IMAGE_NAME").Value
$full = "${registry}/${ns}/${name}"

Write-Host "[INFO] Image:       $full"
Write-Host "[INFO] Primary tag: $primaryTag"
Write-Host "[INFO] Git tag:     $gitSha"

# ---- Login ----
Write-Host "[INFO] Logging in to $registry ..."
$acrUser = (Get-Item "env:ACR_USERNAME").Value
$acrPass = (Get-Item "env:ACR_PASSWORD").Value
$acrPass | docker login $registry --username $acrUser --password-stdin
if ($LASTEXITCODE -ne 0) { throw "Docker login failed" }

# ---- Build ----
Write-Host "[INFO] Building image..."
docker build --pull -t "${full}:${primaryTag}" -t "${full}:${gitSha}" .
if ($LASTEXITCODE -ne 0) { throw "Docker build failed" }

# ---- Push ----
Write-Host "[INFO] Pushing ${full}:${primaryTag} ..."
docker push "${full}:${primaryTag}"
if ($LASTEXITCODE -ne 0) { throw "Docker push (primary) failed" }

Write-Host "[INFO] Pushing ${full}:${gitSha} ..."
docker push "${full}:${gitSha}"
if ($LASTEXITCODE -ne 0) { throw "Docker push (git sha) failed" }

# ---- Done ----
Write-Host @"

============================================================
  Build & push complete.
============================================================
  Image: ${full}:${primaryTag}
         ${full}:${gitSha}

  Next step on your VPS:
    cd /opt/litshowshare
    docker compose pull
    docker compose up -d
============================================================
"@