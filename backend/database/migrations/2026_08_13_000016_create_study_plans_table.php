<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A planner run's output — see "Core data model" in
     * mdfile/semester-command-center.md: "Every planner run is versioned
     * ... explanation_snapshot fields that make 'why did it suggest this
     * yesterday' answerable after the underlying data changes."
     */
    public function up(): void
    {
        Schema::create('study_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestampTz('run_at');
            $table->string('trigger')->default('on_demand'); // on_demand|nightly
            $table->json('explanation_snapshot');
            $table->timestamps();
        });

        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->foreignId('study_plan_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->dropConstrainedForeignId('study_plan_id');
        });

        Schema::dropIfExists('study_plans');
    }
};
