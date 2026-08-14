<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-viewer Notestra reading state — see
     * mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 15. Deliberately separate
     * from `materials`/`material_annotations`: this is per-viewer session
     * state (last page, zoom) that updates far more frequently than
     * document content, not something to bolt onto the material record
     * itself. Both FKs are already owner-scoped so no BelongsToUser
     * global-scope trait is needed here, matching the assessment_material /
     * topic_material pivot pattern.
     */
    public function up(): void
    {
        Schema::create('user_material_states', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->primary(['user_id', 'material_id']);
            $table->timestamp('last_opened_at')->nullable();
            $table->unsignedInteger('last_page')->nullable();
            $table->decimal('zoom', 5, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_material_states');
    }
};
