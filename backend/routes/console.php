<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// "On demand and once nightly", see "When it runs" in
// mdfile/semester-command-center.md.
Schedule::command('planning:run-nightly')->dailyAt('02:00');

// "Notifications" in mdfile/semester-command-center.md: checked
// frequently enough to be timely, not so often it spams.
Schedule::command('notifications:generate')->hourly();

// "Weekly review" in mdfile/semester-command-center.md, runs once the
// week is fully over.
Schedule::command('reviews:generate-weekly')->weeklyOn(1, '03:00');
