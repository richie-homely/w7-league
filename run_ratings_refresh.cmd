@echo off
REM W7 Ratings Weekly - Monday 06:30 (Task Scheduler "W7 Ratings Weekly"). Refreshes every league
REM player's rating from their live Playtomic level and applies it to the site; emails Richie the
REM changes, anything held for review and the names it could not match.
cd /d "%~dp0"
set PYTHONUTF8=1
python scripts\refresh_league_ratings.py --push --notify > "%~dp0data\ratings_refresh.log" 2>&1
echo exit=%ERRORLEVEL% >> "%~dp0data\ratings_refresh.log"
exit /b %ERRORLEVEL%
