<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\WeeklyReviewGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;

/**
 * Runs weekly (see routes/console.php), summarises the week that just
 * ended for every user. Idempotent: WeeklyReviewGenerator returns the
 * existing row for a week that's already been generated.
 */
class GenerateWeeklyReviews extends Command
{
    protected $signature = 'reviews:generate-weekly';

    protected $description = 'Generate the weekly review for every user, for the week that just ended';

    public function handle(WeeklyReviewGenerator $generator): int
    {
        $userIds = User::withoutGlobalScopes()->pluck('id');

        foreach ($userIds as $userId) {
            $user = User::find($userId);
            Auth::setUser($user);

            $review = $generator->generate($user);

            $this->info("User {$user->id}: week of {$review->week_start_date->format('Y-m-d')}: {$review->completed_minutes}/{$review->planned_minutes} min.");
        }

        return self::SUCCESS;
    }
}
