<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Course materials — see "Materials, notes, and revision" in
     * mdfile/semester-command-center.md. Either an uploaded file (disk +
     * path) or an external link (url), tagged by course/week — topic and
     * assessment tagging come via join tables (assessment_material now,
     * topic_material once Topic exists in Phase B).
     */
    public function up(): void
    {
        Schema::create('materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // slide|pdf|reading|recording|link
            $table->string('title');
            $table->string('disk')->nullable();
            $table->string('path')->nullable();
            $table->string('url')->nullable();
            $table->unsignedSmallInteger('week')->nullable();
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};
