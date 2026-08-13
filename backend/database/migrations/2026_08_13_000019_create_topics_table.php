<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * See "Materials, notes, and revision" in
     * mdfile/semester-command-center.md: "Topic confidence: Not started,
     * Learning, Comfortable, Confident" plus last/next review dates that
     * drive the spaced revision engine (Phase C).
     */
    public function up(): void
    {
        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('confidence')->default('not_started'); // not_started|learning|comfortable|confident
            $table->timestampTz('last_reviewed_at')->nullable();
            $table->timestampTz('next_review_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topics');
    }
};
