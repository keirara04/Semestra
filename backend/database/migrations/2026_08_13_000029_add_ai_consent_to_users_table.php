<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-feature consent, off by default — see "Consent levels" in
     * mdfile/AI.md. Timestamp (not a bare boolean) so "when did they
     * consent" is answerable if the policy changes later.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestampTz('ai_syllabus_extraction_consent_at')->nullable()->after('grade_scale');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('ai_syllabus_extraction_consent_at');
        });
    }
};
