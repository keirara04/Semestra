<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per user per ISO week (Monday start). See "Weekly review"
     * in mdfile/semester-command-center.md. Unique on (user_id,
     * week_start_date) so the weekly cron can never double-generate.
     */
    public function up(): void
    {
        Schema::create('weekly_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('week_start_date');
            $table->unsignedInteger('planned_minutes')->default(0);
            $table->unsignedInteger('completed_minutes')->default(0);
            $table->json('cause_breakdown')->nullable();
            $table->string('next_week_risk')->default('comfortable');
            $table->timestamps();

            $table->unique(['user_id', 'week_start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_reviews');
    }
};
