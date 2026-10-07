@echo off
cd /d "%~dp0"
node scripts\launch-app.mjs
if errorlevel 1 pause
