<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Execution-tracking fields fed by focus sessions — see "Focus
     * sessions and work logs" in the plan. estimated_minutes/
     * remaining_estimate_minutes already exist from Phase 2 (Assessment's
     * remaining-effort accessor depends on the latter existing early).
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->unsignedInteger('actual_minutes_logged')->default(0)->after('remaining_estimate_minutes');
            $table->unsignedTinyInteger('completion_percent')->default(0)->after('actual_minutes_logged');
            $table->string('estimate_confidence')->nullable()->after('completion_percent'); // low|medium|high
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['actual_minutes_logged', 'completion_percent', 'estimate_confidence']);
        });
    }
};
