$ErrorActionPreference = 'Stop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host 'Docker is missing. Install Docker Desktop: https://docs.docker.com/get-started/get-docker/'
    exit 1
}
& docker compose version
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker Compose v2 is required. Update Docker Desktop or install the Compose plugin.'
    exit 1
}
$engineType = & docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Docker is not ready. Start Docker Desktop, wait for its engine, then try again.'
    exit 1
}
if ($engineType -ne 'linux') {
    Write-Host 'Switch Docker Desktop to Linux containers, then try again.'
    exit 1
}
Write-Host 'Starting QBUDGET. First run downloads images and dependencies and may take several minutes.'
Write-Host 'When Vite reports ready, open http://localhost:5173. Press Ctrl+C here to stop both services.'
& docker compose --project-directory $PSScriptRoot -f (Join-Path $PSScriptRoot 'compose.yaml') up --build --abort-on-container-exit
exit $LASTEXITCODE
