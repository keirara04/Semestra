<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Task is promoted to course level with optional links to Assessment
     * and Milestone (topic_id is added, unenforced, ahead of the Topic
     * table which ships in Academic Intelligence). See "Core data model"
     * in the plan: this is what lets revision items and ad-hoc reading
     * enter the same schedulable/rankable set as assessment work.
     * `depends_on_task_id` is a single predecessor link; cycles are
     * rejected at the application layer on create/update, not by the
     * schema (see "Ranking": dependency cycles are rejected at creation
     * time, not discovered at planning time).
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assessment_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('topic_id')->nullable(); // no FK yet, Topic ships in Academic Intelligence
            $table->foreignId('depends_on_task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('title');
            $table->unsignedInteger('estimated_minutes')->nullable();
            $table->unsignedInteger('remaining_estimate_minutes')->nullable();
            $table->unsignedTinyInteger('priority')->nullable();
            $table->string('status')->default('open'); // open|done|skipped
            $table->timestampTz('due_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
