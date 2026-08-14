<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Assessment <-> Topic tagging. See "Core data model" in
     * mdfile/semester-command-center.md ("(join) AssessmentTopic <->
     * Assessment"). Plain pivot, no BelongsToUser scope needed (see
     * assessment_material for the same reasoning).
     */
    public function up(): void
    {
        Schema::create('assessment_topic', function (Blueprint $table) {
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('topic_id')->constrained()->cascadeOnDelete();
            $table->primary(['assessment_id', 'topic_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_topic');
    }
};
