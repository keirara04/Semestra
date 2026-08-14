<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * An assessment is a structured multi-day project, not a one-line
     * deadline. See "Assessment and project planner" in the plan.
     * `estimated_minutes` is the authored overall estimate; remaining
     * effort is a derived accessor (sum of open Task.remaining_estimate_
     * minutes), never an independently-editable stored value.
     */
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('grade_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type'); // report|quiz|lab|project|participation|midterm|final|exam|other
            $table->string('title');
            $table->timestampTz('due_at');
            $table->string('status')->default('not_started'); // not_started|in_progress|blocked|done
            $table->string('submission_url')->nullable();
            $table->unsignedInteger('estimated_minutes')->nullable();
            // Group members are plain-text labels only, no accounts. See
            // "Group work (v1 decision)" in the plan.
            $table->json('group_members')->nullable();
            // Ad hoc GitHub/Drive/file links until Materials (Academic
            // Intelligence release) exists.
            $table->json('links')->nullable();
            $table->text('notes')->nullable(); // risks/blockers, free text
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
