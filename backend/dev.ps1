$ErrorActionPreference = 'Stop'
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
    $secretPath = Join-Path $PSScriptRoot '.env'
    if (Test-Path -LiteralPath $secretPath) {
        foreach ($line in Get-Content -LiteralPath $secretPath) {
            if ($line -match '^\s*(GEMINI_API_KEY|GEMINI_MODEL|FIREBASE_API_KEY|FIREBASE_PROJECT_ID)\s*=(.*)$') {
                # Explicit process environment takes precedence over the local file.
                if (-not [Environment]::GetEnvironmentVariable($Matches[1], 'Process')) {
                    [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2].Trim().Trim('"').Trim("'"), 'Process')
                }
            }
        }
    }
    New-Item -ItemType Directory -Force build | Out-Null
    if (Get-Command g++ -ErrorAction SilentlyContinue) {
        & g++ -std=c++17 -O2 -pthread -I vendor src/main.cpp -o build/qbudget-api.exe -lws2_32 -lwinhttp
        if ($LASTEXITCODE -ne 0) { throw 'C++ build failed.' }
        $serverExe = './build/qbudget-api.exe'
    } else {
        $cmakeCommand = Get-Command cmake -ErrorAction SilentlyContinue
        $cmakePath = if ($cmakeCommand) { $cmakeCommand.Source } else { $null }
        if (-not $cmakePath) {
            $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
            if (Test-Path -LiteralPath $vswhere) {
                $cmakePath = & $vswhere -latest -products '*' -find 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/cmake.exe' | Select-Object -First 1
            }
        }
        if (-not $cmakePath) { throw 'Install a C++17 compiler and CMake, or use the root Docker start.ps1.' }
        & $cmakePath -S . -B build/native
        if ($LASTEXITCODE -ne 0) { throw 'CMake configuration failed.' }
        & $cmakePath --build build/native --config Release --target qbudget-api
        if ($LASTEXITCODE -ne 0) { throw 'C++ build failed.' }
        $serverExe = if (Test-Path './build/native/Release/qbudget-api.exe') { './build/native/Release/qbudget-api.exe' } else { './build/native/qbudget-api.exe' }
    }
    & $serverExe
    if ($LASTEXITCODE -ne 0) { throw 'C++ server exited with an error.' }
} finally {
    Pop-Location
}
