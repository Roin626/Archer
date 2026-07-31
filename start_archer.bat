Exit code: 0
Wall time: 1 seconds
Output:
@echo off
setlocal

set "ROOT=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start_archer.ps1"

endlocal

