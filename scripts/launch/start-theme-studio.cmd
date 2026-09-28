@echo off
rem Starts the Theme Studio and opens it in your browser once it is ready.
title Math Run - Theme Studio
cd /d C:\dev\math-game
start "" /b node scripts\open-when-ready.mjs http://localhost:4455
call npm.cmd run studio
echo.
echo The Theme Studio has stopped.
pause
