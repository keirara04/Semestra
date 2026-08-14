<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per user per day. The hard per-day budget cap from
     * "AI operations (v1 constraints)" in mdfile/semester-command-center.md
     * is enforced by checking this row before every provider call, not
     * after. Unique on (user_id, date) so incrementing is a single
     * upsert, never a race between two counters.
     */
    public function up(): void
    {
        Schema::create('ai_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->unsignedInteger('requests_count')->default(0);
            $table->unsignedInteger('tokens_used')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usages');
    }
};
