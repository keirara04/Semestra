<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * tasks.topic_id existed unenforced since Foundation Phase 2 ("no FK
     * yet — Topic ships in Academic Intelligence"). Topic now exists —
     * add the real constraint.
     */
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->foreign('topic_id')->references('id')->on('topics')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropForeign(['topic_id']);
        });
    }
};
