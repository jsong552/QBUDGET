$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Force build | Out-Null
    & g++ -std=c++17 -O2 -pthread -I vendor src/main.cpp -o build/qbudget-api.exe -lws2_32
    if ($LASTEXITCODE -ne 0) { throw 'C++ build failed.' }
    & ./build/qbudget-api.exe
    if ($LASTEXITCODE -ne 0) { throw 'C++ server exited with an error.' }
} finally {
    Pop-Location
}
