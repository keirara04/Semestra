<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\User;
use App\Services\PlanningRunner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;

/**
 * "On demand (student requests a re-plan) and once nightly" — see "When
 * it runs" in mdfile/semester-command-center.md. Iterates every user with
 * at least one open task; BuildsCapacityInputs' queries rely on Eloquent's
 * BelongsToUser global scope via Auth::user(), so each iteration sets the
 * default-guard user before calling the shared runner.
 */
class RunNightlyPlanning extends Command
{
    protected $signature = 'planning:run-nightly';

    protected $description = 'Re-run the planning pipeline for every user with open tasks';

    public function handle(PlanningRunner $runner): int
    {
        // Task::withoutGlobalScopes() — BelongsToUser's scope depends on
        // Auth::user(), which isn't set yet at this point in a console
        // context; querying explicitly across all users here is correct,
        // not an accidental unscoped read.
        $userIds = Task::withoutGlobalScopes()
            ->where('status', 'open')
            ->distinct()
            ->pluck('user_id');

        foreach ($userIds as $userId) {
            $user = User::find($userId);
            Auth::setUser($user);

            $result = $runner->run($user, trigger: 'nightly');

            $this->info("User {$user->id}: {$result['created_blocks']} suggested blocks.");
        }

        return self::SUCCESS;
    }
}
