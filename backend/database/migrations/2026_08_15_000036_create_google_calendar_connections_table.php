<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Calendar roadmap Phase 5: one row per connected Google account.
     * Tokens are stored via the model's `encrypted` cast (app key, not a
     * separate secrets store — consistent with this app's existing
     * "no extra infra for v1" posture). `sync_token` is Google's
     * incremental-sync cursor for events.list; null means the next pull
     * does a full sync instead of a delta.
     */
    public function up(): void
    {
        Schema::create('google_calendar_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('access_token');
            $table->text('refresh_token');
            $table->timestampTz('expires_at');
            $table->string('google_calendar_id')->default('primary');
            $table->text('sync_token')->nullable();
            $table->timestampTz('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_calendar_connections');
    }
};
