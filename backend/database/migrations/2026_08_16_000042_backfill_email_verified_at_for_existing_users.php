<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Grandfathers every account that existed before email verification
     * was enforced. They signed up under a contract that never asked
     * them to verify anything; retroactively marking them unverified
     * would surface a "confirm your email" prompt for an address they've
     * been using for months; and — because MustVerifyEmail's
     * hasVerifiedEmail() is what SendNotificationEmail checks — it would
     * silently stop their notification email too.
     */
    public function up(): void
    {
        DB::table('users')->whereNull('email_verified_at')->update(['email_verified_at' => now()]);
    }

    public function down(): void
    {
        // Deliberately irreversible: there's no record of which rows
        // this touched, and reversing would falsely mark real
        // verifications (that happened to land after this ran) as unverified.
    }
};
