<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Assessment <-> Material tagging — see "Core data model" in
     * mdfile/semester-command-center.md ("(join) AssessmentMaterial —
     * Material"). Plain pivot table, no BelongsToUser scope needed: both
     * sides are already owner-scoped, so there's no cross-user row this
     * table could expose.
     */
    public function up(): void
    {
        Schema::create('assessment_material', function (Blueprint $table) {
            $table->foreignId('assessment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->primary(['assessment_id', 'material_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_material');
    }
};
