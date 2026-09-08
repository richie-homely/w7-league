@echo off
rem W7 League Bookings - hourly: which league fixtures are booked on the courts (Playtomic participants) -> league_bookings table for the site.
rem Print-only on purpose: no log redirect.
set PYTHONUTF8=1
cd /d C:\Users\richi\w7-league
python scripts\league_bookings.py --days 21 --push
