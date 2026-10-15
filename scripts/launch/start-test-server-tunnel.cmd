@echo off
rem Starts the Expo dev server in tunnel mode: the phone connects through the
rem internet instead of the home network, so it works when the phone and the
rem PC are on different networks (e.g. a Wi-Fi mesh with its own network, a
rem VPN, or mobile data). Slower than the normal test server. Scan the QR code
rem with the iPhone camera or open the project in Expo Go.
title Math Run - test server (tunnel)
cd /d C:\dev\math-game
rem "npm start" also rebuilds the themes, pets and sounds first.
call npm.cmd start -- --tunnel
echo.
echo The test server has stopped.
pause
