<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Never mass-assignable — set explicitly by ProfileController
            // so it can't be smuggled in alongside other profile fields.
            // An email change writes here first; `email` itself is only
            // overwritten once the verification link for this address is
            // clicked (see EmailVerificationController).
            $table->string('pending_email')->nullable()->unique()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('pending_email');
        });
    }
};
