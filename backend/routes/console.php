<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// "On demand and once nightly" — see "When it runs" in
// mdfile/semester-command-center.md.
Schedule::command('planning:run-nightly')->dailyAt('02:00');
