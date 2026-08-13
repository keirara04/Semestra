<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Separate from `status` (pending/sent/failed — delivery outcome):
     * read_at tracks whether the user has seen it in the in-app list.
     */
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->timestampTz('read_at')->nullable()->after('sent_at');
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn('read_at');
        });
    }
};
