@echo off
set SCRIPT_DIR=%~dp0
powershell.exe -ExecutionPolicy Bypass -File "%SCRIPT_DIR%environment-setup\Detect-Python.ps1"
if %ERRORLEVEL% equ 0 (
    echo Python is installed and compatible. Setting up the environment...
    powershell.exe -ExecutionPolicy Bypass -File "%SCRIPT_DIR%environment-setup\setup-env.ps1"
) else (
    echo Python is not installed or compatible. Environment setup aborted.
)
pause
