<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Extract draft assessment dates and tasks from a pasted syllabus or
     * uploaded document. Every extracted deadline, weighting, or task is
     * presented as an editable draft with source location. Nothing is
     * saved automatically." — Stage 1 in mdfile/AI.md. `candidates` holds
     * the model's proposed assessments/tasks, each with a source fragment
     * and confidence; nothing here writes to assessments/tasks until
     * confirmed.
     */
    public function up(): void
    {
        Schema::create('syllabus_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('material_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status')->default('pending'); // pending|confirmed|discarded
            $table->json('candidates');
            $table->string('model');
            $table->timestampTz('applied_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('syllabus_drafts');
    }
};
