<?php

namespace App\Services\AI;

use App\Models\AiUsage;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Hard per-day budget cap, enforced before every provider call — see
 * "AI operations (v1 constraints)" in mdfile/semester-command-center.md.
 * One row per (user, day) in ai_usages; checking "today's" row is always
 * a single indexed lookup, never a scan.
 */
class AiBudgetService
{
    public function remaining(User $user): int
    {
        $limit = (int) config('services.openrouter.daily_request_limit');
        $used = AiUsage::where('date', Carbon::today($user->timezone)->format('Y-m-d'))->value('requests_count') ?? 0;

        return max(0, $limit - $used);
    }

    /**
     * Reserves a request slot atomically, rather than just checking —
     * two concurrent calls both reading "1 remaining" and both proceeding
     * is exactly the overshoot this method exists to prevent. The row
     * lock makes the read-then-increment a single indivisible step; the
     * (user_id, date) unique constraint (see the ai_usages migration)
     * means concurrent firstOrCreate() calls for the same day can never
     * produce two rows. Call release() if the reserved call ends up not
     * happening (provider error) so it doesn't count against the user.
     *
     * @throws AiBudgetExceededException
     */
    public function ensureWithinBudget(User $user): void
    {
        $limit = (int) config('services.openrouter.daily_request_limit');
        $date = Carbon::today($user->timezone)->format('Y-m-d');

        $reserved = DB::transaction(function () use ($date, $limit) {
            $usage = AiUsage::query()->lockForUpdate()->firstOrCreate(['date' => $date]);

            if ($usage->requests_count >= $limit) {
                return false;
            }

            $usage->increment('requests_count');

            return true;
        });

        if (! $reserved) {
            throw new AiBudgetExceededException("Daily AI request budget reached for user {$user->id}.");
        }
    }

    /**
     * Gives back a slot reserved by ensureWithinBudget() when the provider
     * call it was reserved for never completed — otherwise a failed
     * extraction would still cost the user part of their daily budget.
     */
    public function release(User $user): void
    {
        $date = Carbon::today($user->timezone)->format('Y-m-d');

        DB::transaction(function () use ($date) {
            AiUsage::query()->lockForUpdate()->where('date', $date)->first()
                ?->decrement('requests_count');
        });
    }

    public function recordUsage(User $user, int $totalTokens): void
    {
        $date = Carbon::today($user->timezone)->format('Y-m-d');
        $usage = AiUsage::firstOrCreate(['date' => $date]);
        $usage->increment('tokens_used', $totalTokens);
    }
}
