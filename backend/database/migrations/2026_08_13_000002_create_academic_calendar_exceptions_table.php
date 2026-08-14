<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Term breaks/holidays. See "Time, dates, and recurrence" in the plan:
     * Semester "carries ... a list of term breaks/holidays
     * (academic_calendar_exceptions)". Own table (not a json column on
     * semesters) so the capacity engine (Phase 3) can query a date range
     * directly instead of parsing embedded json per request.
     */
    public function up(): void
    {
        Schema::create('academic_calendar_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->date('start_date');
            $table->date('end_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_calendar_exceptions');
    }
};
