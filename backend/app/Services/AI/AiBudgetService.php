<?php

namespace App\Services\AI;

use App\Models\AiUsage;
use App\Models\User;
use Illuminate\Support\Carbon;

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
     * @throws AiBudgetExceededException
     */
    public function ensureWithinBudget(User $user): void
    {
        if ($this->remaining($user) <= 0) {
            throw new AiBudgetExceededException("Daily AI request budget reached for user {$user->id}.");
        }
    }

    public function recordUsage(User $user, int $totalTokens): void
    {
        $date = Carbon::today($user->timezone)->format('Y-m-d');
        $usage = AiUsage::firstOrCreate(['date' => $date]);
        $usage->increment('requests_count');
        $usage->increment('tokens_used', $totalTokens);
    }
}
