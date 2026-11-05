@echo off
setlocal
rem Parse the whole block before PowerShell updates this launcher.
(
    powershell.exe -NoProfile -File "%~dp0update.ps1"
    if errorlevel 1 (
        echo Update failed. See the error above.
        pause
        exit /b 1
    )
    pause
    exit /b 0
)
