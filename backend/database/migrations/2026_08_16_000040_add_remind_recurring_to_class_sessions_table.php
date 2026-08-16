<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            // Default false: a reminder fires once, for the next upcoming
            // occurrence, then clears itself — recurring is opt-in, not
            // assumed just because the class itself repeats weekly.
            $table->boolean('remind_recurring')->default(false)->after('remind_minutes_before');
        });
    }

    public function down(): void
    {
        Schema::table('class_sessions', function (Blueprint $table) {
            $table->dropColumn('remind_recurring');
        });
    }
};
