<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Spaced revision state — see "Materials, notes, and revision" in
     * mdfile/semester-command-center.md. `review_stage` indexes into the
     * 1/3/7-day cadence (0 = never reviewed, 3 = cycle complete).
     * `missed_decay_applied_at` guards against re-decaying confidence
     * every day a review stays overdue — only once per missed review.
     */
    public function up(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->unsignedTinyInteger('review_stage')->default(0)->after('confidence');
            $table->timestampTz('missed_decay_applied_at')->nullable()->after('next_review_at');
        });
    }

    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropColumn(['review_stage', 'missed_decay_applied_at']);
        });
    }
};
