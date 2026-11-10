@echo off
setlocal
cd /d "%~dp0"
title NIS-GameCenter - Game Workshop
echo NIS-GameCenter - Game Workshop
echo Open http://localhost:5173 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
echo.

where node >nul 2>&1
if errorlevel 1 goto check_py
node -e "if (Number(process.versions.node.split('.')[0]) < 18) process.exit(1)" >nul 2>&1
if not errorlevel 1 goto run_node

:check_py
where py >nul 2>&1
if errorlevel 1 goto check_python
py -3 -c "import sys; sys.exit(0 if sys.version_info.major == 3 else 1)" >nul 2>&1
if not errorlevel 1 goto run_py

:check_python
where python >nul 2>&1
if errorlevel 1 goto find_python
python -c "import sys; sys.exit(0 if sys.version_info.major == 3 else 1)" >nul 2>&1
if not errorlevel 1 goto run_python

:find_python
set "KADR_PYTHON="
for /d %%D in ("%LocalAppData%\Programs\Python\Python3*") do if exist "%%~fD\python.exe" set "KADR_PYTHON=%%~fD\python.exe"
if not defined KADR_PYTHON goto missing_runtime
"%KADR_PYTHON%" -c "import sys; sys.exit(0 if sys.version_info.major == 3 else 1)" >nul 2>&1
if not errorlevel 1 goto run_python_local

:missing_runtime
echo ERROR: Install Node.js 18+ or Python 3, then run this file again.
echo No npm packages are needed.
pause
exit /b 1

:run_node
node tools\server.mjs
goto stopped

:run_py
py -3 -u -m http.server 5173 --bind 127.0.0.1
goto stopped

:run_python
python -u -m http.server 5173 --bind 127.0.0.1
goto stopped

:run_python_local
"%KADR_PYTHON%" -u -m http.server 5173 --bind 127.0.0.1
goto stopped

:stopped
set "KADR_EXIT=%errorlevel%"
if "%KADR_EXIT%"=="0" exit /b 0
echo.
echo The server stopped. Check the error above.
echo If port 5173 is already in use, try opening http://localhost:5173.
pause
exit /b %KADR_EXIT%
