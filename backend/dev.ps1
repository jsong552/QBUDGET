$ErrorActionPreference = 'Stop'
if (-not (Get-Command g++ -ErrorAction SilentlyContinue)) {
    throw 'Native startup needs g++ on PATH. Use the root start.ps1 Docker launcher instead, or install a C++17 compiler.'
}
Push-Location $PSScriptRoot
try {
    # Load only the public Firebase config needed by the native API.
    $configPath = Join-Path $PSScriptRoot '../frontend/.env'
    if (Test-Path -LiteralPath $configPath) {
        foreach ($line in Get-Content -LiteralPath $configPath) {
            if ($line -match '^VITE_FIREBASE_(API_KEY|PROJECT_ID)=(.*)$') {
                [Environment]::SetEnvironmentVariable('FIREBASE_' + $Matches[1], $Matches[2].Trim().Trim('"').Trim("'"), 'Process')
            }
        }
    }
    New-Item -ItemType Directory -Force build | Out-Null
    & g++ -std=c++17 -O2 -pthread -I vendor src/main.cpp -o build/qbudget-api.exe -lws2_32 -lwinhttp
    if ($LASTEXITCODE -ne 0) { throw 'C++ build failed.' }
    & ./build/qbudget-api.exe
    if ($LASTEXITCODE -ne 0) { throw 'C++ server exited with an error.' }
} finally {
    Pop-Location
}
