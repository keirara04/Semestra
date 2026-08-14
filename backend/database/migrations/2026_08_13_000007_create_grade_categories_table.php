<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Assessment-group for drop-lowest / best-N-of-M rules, declared at
     * course setup. See "Grade and outcome tracker" in the plan.
     */
    public function up(): void
    {
        Schema::create('grade_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedTinyInteger('drop_lowest_count')->nullable();
            $table->unsignedTinyInteger('best_n')->nullable();
            $table->unsignedTinyInteger('best_of_m')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_categories');
    }
};
