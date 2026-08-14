<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CalendarBlock owns time. See "Core data model" in the plan. The
     * schema carries the full canonical status enum (suggested/accepted/
     * moved/skipped/done) up front so it doesn't need reshaping when the
     * Planning Engine release starts writing "suggested"/"moved" blocks;
     * this release (manual entry only) only ever writes accepted/skipped/
     * done. Likewise `type` covers lecture/commitment/study, but Foundation
     * only creates `study` blocks; lecture/commitment instances are still
     * read from ClassSession/Commitment via the capacity engine (Phase 3),
     * not materialized as rows here yet.
     */
    public function up(): void
    {
        Schema::create('calendar_blocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('task_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type')->default('study'); // lecture|commitment|study
            $table->string('status')->default('accepted'); // suggested|accepted|moved|skipped|done
            $table->string('title')->nullable();
            $table->timestampTz('start_at');
            $table->timestampTz('end_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_blocks');
    }
};
