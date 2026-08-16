<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Recurring ad-hoc study/commitment blocks — see calendar roadmap
     * Phase 4b. Materialized rows, not virtual expansion like ClassSession/
     * Commitment: CalendarBlocks are individually mutable per occurrence
     * (status suggested/accepted/moved/done), which a virtual "recompute
     * on every request" model doesn't support without inventing a parallel
     * per-occurrence override table. `recurrence_group_id` links every row
     * in a series (the first row's own id, set after it's created);
     * `recurrence_day_of_week`/`recurrence_until` only ever populated on
     * that first row, as a record of the pattern that generated the series.
     */
    public function up(): void
    {
        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->unsignedBigInteger('recurrence_group_id')->nullable()->after('task_id');
            $table->unsignedTinyInteger('recurrence_day_of_week')->nullable()->after('recurrence_group_id');
            $table->date('recurrence_until')->nullable()->after('recurrence_day_of_week');
            $table->index('recurrence_group_id');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->dropIndex(['recurrence_group_id']);
            $table->dropColumn(['recurrence_group_id', 'recurrence_day_of_week', 'recurrence_until']);
        });
    }
};
