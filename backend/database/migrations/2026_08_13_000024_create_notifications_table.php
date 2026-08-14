<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * See "Notifications" in mdfile/semester-command-center.md. Every
     * notification carries an idempotency key so a cron re-run or job
     * retry can never send a duplicate; enforced with a real unique
     * constraint, not just application-level dedup.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // deficit_today|topic_unreviewed|tomorrow_overloaded|exam_weak_topics
            $table->string('subject_type')->nullable(); // assessment|topic
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('idempotency_key')->unique();
            $table->string('channel')->default('email');
            $table->string('status')->default('pending'); // pending|sent|failed
            $table->text('message');
            $table->json('payload')->nullable();
            $table->timestampTz('sent_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
