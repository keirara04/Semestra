<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Draft-then-confirm import of a weekly timetable pasted as an
     * Everytime (에브리타임) public share link — same "nothing is saved
     * automatically" shape as syllabus_drafts, but semester-scoped rather
     * than course-scoped: one imported timetable spans multiple courses,
     * some of which may not exist yet. `payload` holds the parsed
     * subjects (title/day/time/location); confirm() turns selected ones
     * into real Course + ClassSession rows.
     */
    public function up(): void
    {
        Schema::create('timetable_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->string('source_url');
            $table->string('status')->default('pending'); // pending|confirmed|discarded
            $table->json('payload');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timetable_imports');
    }
};
