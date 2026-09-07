@echo off
rem W7 League Usage Daily - emails Richie yesterday's site usage (whole league site) at 08:05.
rem Print-only on purpose: no log redirect.
set PYTHONUTF8=1
cd /d C:\Users\richi\w7-league
python scripts\site_usage_email.py
