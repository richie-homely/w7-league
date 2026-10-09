@echo off
REM W7 P100 Note Watch - hourly (Task Scheduler). Records the Padel 100 note's readership and
REM emails Richie a summary when it spikes (scripts\p100_views_watch.py).
cd /d "%~dp0"
set PYTHONUTF8=1
python scripts\p100_views_watch.py > "%~dp0data\p100_views_watch.log" 2>&1
echo exit=%ERRORLEVEL% >> "%~dp0data\p100_views_watch.log"
exit /b %ERRORLEVEL%
