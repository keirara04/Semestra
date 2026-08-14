<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('code')->nullable();
            // Hex colour, pre-validated at the frontend palette level (see
            // Design direction). Stored as-is, not re-validated server-side
            // beyond format.
            $table->string('colour', 7);
            $table->string('instructor')->nullable();
            $table->unsignedTinyInteger('credits')->nullable();
            $table->string('grade_target')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
