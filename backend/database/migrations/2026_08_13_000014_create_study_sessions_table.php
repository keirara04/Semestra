<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * StudySession is the execution record for a CalendarBlock. See "Core
     * data model" in the plan. `actual_minutes` is only set once the
     * session ends; `outcome`/notes/blocker come from the end-of-session
     * reflection (see "Focus sessions and work logs").
     */
    public function up(): void
    {
        Schema::create('study_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('calendar_block_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('planned_minutes');
            $table->unsignedInteger('actual_minutes')->nullable();
            $table->string('status')->default('running'); // running|paused|ended
            $table->timestampTz('started_at');
            $table->timestampTz('paused_at')->nullable();
            $table->unsignedInteger('paused_seconds_total')->default(0);
            $table->timestampTz('ended_at')->nullable();
            $table->string('outcome')->nullable(); // completed|partial|blocked|longer_than_estimated|easier_than_estimated
            $table->text('notes')->nullable();
            $table->text('blocker')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('study_sessions');
    }
};
