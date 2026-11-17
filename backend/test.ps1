# Compile and run the backend suite without needing Firebase or Docker.
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Force build | Out-Null
    & g++ -std=c++17 -Wall -Wextra -I vendor tests/data_test.cpp -o build/qbudget-tests.exe -lws2_32 -lwinhttp
    if ($LASTEXITCODE -ne 0) { throw 'Test build failed.' }
    & ./build/qbudget-tests.exe
    if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
} finally { Pop-Location }
