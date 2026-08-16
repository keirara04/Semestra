<?php

namespace App\Console\Commands;

use App\Models\CalendarBlock;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * One-off backfill for the timezone bug fixed in CalendarBlockController
 * (normalizeTimezone()): every CalendarBlock created through the manual
 * Add/Edit form, drag-reschedule, click-drag create, or a recurring
 * series — before that fix — has its wall-clock digits stored as if they
 * were UTC, instead of the student's own timezone. This re-interprets
 * those same digits in the student's timezone and re-saves the correct
 * UTC instant, undoing exactly the error normalizeTimezone() now
 * prevents going forward.
 *
 * Scope, by how a row's origin is identified — no other provenance flag
 * exists on CalendarBlock:
 *   - `source = 'google'`: never touched. Pulled directly from Google's
 *     real event times, never went through the buggy naive-string path.
 *   - `study_plan_id` set: never touched. Only PlanningRunner sets this,
 *     and it already parses times with the student's timezone correctly
 *     — these rows were never wrong.
 *   - everything else (`study_plan_id` null, `source` null): backfilled.
 *
 * Known gap: a planner-suggested block (study_plan_id set) that a
 * student later dragged or manually edited went through the buggy update
 * path for that edit and may still be wrong — there's no "last touched by
 * which code path" flag to detect that case, so it's left alone here
 * rather than guessed at. Re-dragging such a block after this fix ships
 * corrects it going forward.
 */
class BackfillCalendarBlockTimezones extends Command
{
    protected $signature = 'calendar-blocks:backfill-timezone {--dry-run : Report what would change without saving}';

    protected $description = 'Re-interpret pre-fix CalendarBlock times in each user\'s own timezone instead of UTC';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $blocks = CalendarBlock::withoutGlobalScopes()
            ->whereNull('source')
            ->whereNull('study_plan_id')
            ->get()
            ->groupBy('user_id');

        $totalFixed = 0;

        foreach ($blocks as $userId => $userBlocks) {
            $user = User::find($userId);

            if ($user === null) {
                continue;
            }

            foreach ($userBlocks as $block) {
                $oldStart = $block->start_at->toIso8601String();
                $oldEnd = $block->end_at->toIso8601String();

                $newStart = Carbon::parse($block->start_at->format('Y-m-d H:i:s'), $user->timezone)->utc();
                $newEnd = Carbon::parse($block->end_at->format('Y-m-d H:i:s'), $user->timezone)->utc();

                if ($newStart->equalTo($block->start_at) && $newEnd->equalTo($block->end_at)) {
                    // User's timezone is UTC, or this row happens to
                    // already be correct — nothing to change.
                    continue;
                }

                $this->line(sprintf(
                    'User %d, block %d (%s): %s–%s -> %s–%s%s',
                    $userId,
                    $block->id,
                    $block->title ?? 'Study',
                    $oldStart,
                    $oldEnd,
                    $newStart->toIso8601String(),
                    $newEnd->toIso8601String(),
                    $dryRun ? ' [dry-run]' : '',
                ));

                if (! $dryRun) {
                    $block->forceFill(['start_at' => $newStart, 'end_at' => $newEnd])->save();
                }

                $totalFixed++;
            }
        }

        $this->info(($dryRun ? 'Would fix ' : 'Fixed ')."{$totalFixed} block(s).");

        return self::SUCCESS;
    }
}
