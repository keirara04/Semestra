<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Postgres does not auto-index foreign keys the way MySQL does, and every
 * read on a BelongsToUser-scoped table is filtered by user_id (the global
 * scope in app/Models/Concerns/BelongsToUser.php) — every one of these was
 * a sequential scan. calendar_blocks and tasks get a composite leading on
 * user_id instead of a plain single-column index, matching their most
 * common query shapes (date-range reads, status+due_at ranking); the
 * composite already covers plain user_id lookups too. weekly_reviews,
 * ai_usages (unique on user_id+other column), google_calendar_connections,
 * and user_material_states (composite primary key) already have a
 * leading-user_id index and are skipped.
 */
return new class extends Migration
{
    public function up(): void
    {
        $singleColumn = [
            'courses', 'academic_calendar_exceptions', 'semesters', 'grade_categories',
            'commitments', 'class_sessions', 'milestones', 'grade_items', 'study_sessions',
            'submissions', 'class_session_exceptions', 'study_plans', 'topics', 'notifications',
            'assessments', 'syllabus_drafts', 'ai_interactions', 'material_annotations',
            'material_notes', 'materials', 'timetable_imports',
        ];

        foreach ($singleColumn as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->index('user_id');
            });
        }

        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->index(['user_id', 'start_at']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->index(['user_id', 'status', 'due_at']);
        });
    }

    public function down(): void
    {
        $singleColumn = [
            'courses', 'academic_calendar_exceptions', 'semesters', 'grade_categories',
            'commitments', 'class_sessions', 'milestones', 'grade_items', 'study_sessions',
            'submissions', 'class_session_exceptions', 'study_plans', 'topics', 'notifications',
            'assessments', 'syllabus_drafts', 'ai_interactions', 'material_annotations',
            'material_notes', 'materials', 'timetable_imports',
        ];

        foreach ($singleColumn as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                // A string arg is an index name; an array arg is a column
                // list Laravel derives a name from — passing the name
                // itself wrapped in an array double-suffixes it.
                $table->dropIndex($table->getTable().'_user_id_index');
            });
        }

        Schema::table('calendar_blocks', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'start_at']);
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status', 'due_at']);
        });
    }
};
