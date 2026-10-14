@echo off
title Fruteria La Pasadita - Servidor local
cd /d "%~dp0"

echo.
echo  ================================================
echo   FRUTERIA LA PASADITA - vista local
echo  ================================================
echo.
echo   Pagina:   http://localhost:8000
echo   Panel:    http://localhost:8000/admin/index.html
echo.
echo   DEJA ESTA VENTANA ABIERTA.
echo   Para detener el servidor, cierra esta ventana.
echo.

rem Espera 2 segundos antes de abrir el navegador, para que el
rem servidor de tiempo a arrancar. Si no, sale "no se puede conectar".
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:8000/admin/index.html'"

node servidor-local.js

echo.
echo  El servidor se ha detenido.
echo  Si viste un error arriba, revisa que Node.js este instalado.
echo.
pause
