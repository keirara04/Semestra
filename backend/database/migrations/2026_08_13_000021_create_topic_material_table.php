<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Topic <-> Material tagging. See "Core data model" in
     * mdfile/semester-command-center.md ("(join) TopicMaterial <->
     * Material").
     */
    public function up(): void
    {
        Schema::create('topic_material', function (Blueprint $table) {
            $table->foreignId('topic_id')->constrained()->cascadeOnDelete();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->primary(['topic_id', 'material_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('topic_material');
    }
};
