@echo off
rem Starts the Expo dev server (scan the QR code with Expo Go) and opens
rem the web version of the app in your browser once it is ready.
title Math Run - test server
cd /d C:\dev\math-game
start "" /b node scripts\open-when-ready.mjs http://localhost:8081
rem "npm start" also rebuilds the themes first.
call npm.cmd start
echo.
echo The test server has stopped.
pause
