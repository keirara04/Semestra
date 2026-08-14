<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Profile fields. See "Time, dates, and recurrence" and
            // "Timetable and availability" in the plan. One profile per
            // student, so these live directly on users rather than a
            // separate profiles table.
            $table->string('timezone')->default('UTC')->after('email');
            $table->unsignedSmallInteger('max_study_hours_per_day')->default(6)->after('timezone');
            $table->json('deep_work_windows')->nullable()->after('max_study_hours_per_day');
            $table->json('quiet_hours')->nullable()->after('deep_work_windows');
            $table->string('grade_scale')->default('4.0')->after('quiet_hours');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'timezone',
                'max_study_hours_per_day',
                'deep_work_windows',
                'quiet_hours',
                'grade_scale',
            ]);
        });
    }
};
