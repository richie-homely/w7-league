@echo off
rem W7 League Bookings - hourly: which league fixtures are booked on the courts (Playtomic participants) -> league_bookings table for the site.
rem Print-only on purpose: no log redirect.
rem Path comes from %~dp0, not a hard-coded home: this NUC's account is C:\Users\Richie
rem and the old C:\Users\richi path made the cd fail silently (Richie, 13 Sep 2026).
set PYTHONUTF8=1
cd /d "%~dp0"
python scripts\league_bookings.py --days 21 --push
