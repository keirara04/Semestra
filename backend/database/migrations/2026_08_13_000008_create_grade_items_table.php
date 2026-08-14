<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * GradeItem.weighting is the single canonical source of grade weight;
     * Assessment links to a GradeItem rather than storing its own duplicate
     * weight (see "Grade and outcome tracker" in the plan).
     */
    public function up(): void
    {
        Schema::create('grade_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->foreignId('grade_category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->decimal('weighting', 5, 2);
            $table->decimal('max_score', 6, 2)->default(100);
            $table->decimal('achieved_score', 6, 2)->nullable();
            $table->decimal('pass_hurdle_percent', 5, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_items');
    }
};
