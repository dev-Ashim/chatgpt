@echo off
title Jarvis
cd /d "%~dp0"

if not exist node_modules (
  echo First run: installing Jarvis...
  call npm install --no-fund --no-audit
)

rem Start the server only if it isn't already running
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:7777/health -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "Jarvis Server" /min cmd /k node server.js
  powershell -NoProfile -Command "for ($i=0; $i -lt 20; $i++) { try { Invoke-WebRequest -UseBasicParsing http://127.0.0.1:7777/health -TimeoutSec 1 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 400 } }; exit 1"
)

rem Open the UI as its own app window (Edge has free natural voices + speech recognition)
start "" msedge --app=http://127.0.0.1:7777 --window-size=520,820
