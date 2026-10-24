$ErrorActionPreference = 'Stop'
cmake -S native/player-host -B native/player-host/build -A x64
if ($LASTEXITCODE -ne 0) { throw 'CMake configuration failed. Install Visual Studio Build Tools with Desktop development with C++ and CMake.' }
cmake --build native/player-host/build --config Release
if ($LASTEXITCODE -ne 0) { throw 'Native build failed.' }
New-Item -ItemType Directory -Force native/player-host/out | Out-Null
Copy-Item native/player-host/build/Release/zenplex-player-host.exe native/player-host/out/zenplex-player-host.exe -Force
Copy-Item native/player-host/input.conf native/player-host/out/input.conf -Force
Write-Host 'Helper built. Install mpv-2.dll and run npm run native:doctor.'
