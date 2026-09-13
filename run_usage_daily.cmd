@echo off
rem W7 League Usage Daily - emails Richie yesterday's site usage (whole league site) at 08:05.
rem Path comes from %~dp0, not a hard-coded home: this NUC's account is C:\Users\Richie
rem and the old C:\Users\richi path made the cd fail silently (Richie, 13 Sep 2026).
set PYTHONUTF8=1
cd /d "%~dp0"
python scripts\site_usage_email.py > "%~dp0data\site_usage_email.log" 2>&1
echo exit=%ERRORLEVEL% >> "%~dp0data\site_usage_email.log"
exit /b %ERRORLEVEL%
