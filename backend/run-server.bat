@echo off
cd /d "C:\Users\User\OneDrive\READET~1\GEOJER~1\backend"
start /MIN "" node src/server.js
echo Server started with PID:
wmic process where "name='node.exe' and commandline like '%%server.js%%'" get processid
