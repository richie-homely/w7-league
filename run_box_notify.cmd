@echo off
REM Box League result notifications - every 15 min from the laptop (Task Scheduler "W7 Box Notify").
REM Print only; state in data\box_notify_state.json prevents re-sends.
cd /d "%~dp0"
set PYTHONUTF8=1
python scripts\box_league_notify.py
