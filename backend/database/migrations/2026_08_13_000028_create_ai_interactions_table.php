<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Audit trail for every AI call — see "Privacy, security, and
     * retention" in mdfile/AI.md. `input_redacted` never holds the raw
     * document text, only a short description, so this table stays safe
     * to inspect for debugging without itself becoming a data-retention
     * liability.
     */
    public function up(): void
    {
        Schema::create('ai_interactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('intent');
            $table->text('input_redacted')->nullable();
            $table->string('model');
            $table->unsignedInteger('total_tokens')->default(0);
            $table->string('status'); // succeeded|failed|budget_exceeded|consent_missing
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_interactions');
    }
};
