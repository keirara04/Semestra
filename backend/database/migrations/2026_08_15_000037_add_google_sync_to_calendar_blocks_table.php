<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `source`/`external_id` mark a block as owned by an external
     * calendar rather than this app's own planner/manual-entry flow —
     * pulled-in Google events get `source: 'google'` plus Google's event
     * id; a student-created block later pushed to Google gets its
     * `external_id` filled in after the push succeeds, `source` stays
     * null (it originated here, Google is just a mirror of it).
     * `source` is the flag PlanningRunner's suggested-block wipe and any
     * future provider integration key off of, not `type`.
     */
    public function up(): void
    {
        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->string('source')->nullable()->after('type');
            $table->string('external_id')->nullable()->after('source');
            $table->index(['source', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->dropIndex(['source', 'external_id']);
            $table->dropColumn(['source', 'external_id']);
        });
    }
};
