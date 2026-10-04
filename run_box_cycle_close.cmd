@echo off
REM W7 Box Cycle Close - 00:30 daily (Task Scheduler "W7 Box Cycle Close"). Closes the box league
REM cycle that ended yesterday, if any: voids unplayed fixtures, applies promotion/relegation,
REM opens the next cycle, renders the team email drafts and emails Richie the pack.
REM Nothing goes to a player until box_cycle_close.py --send is run. Most nights it does nothing.
cd /d "%~dp0"
set PYTHONUTF8=1
python scripts\box_cycle_close.py --auto > "%~dp0data\box_cycle_close.log" 2>&1
echo exit=%ERRORLEVEL% >> "%~dp0data\box_cycle_close.log"
exit /b %ERRORLEVEL%
