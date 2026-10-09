@echo off
REM W7 Court Points - daily (Task Scheduler). Points from the newest Playtomic extract, pushed to
REM the league site; on the 1st also emails last month's unlocked rewards (scripts\court_points.py).
cd /d "%~dp0"
set PYTHONUTF8=1
python scripts\court_points.py --auto > "%~dp0data\court_points.log" 2>&1
echo exit=%ERRORLEVEL% >> "%~dp0data\court_points.log"
exit /b %ERRORLEVEL%
