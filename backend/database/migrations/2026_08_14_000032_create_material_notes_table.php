<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Notestra study notes — see mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 7.
     * Separate from `material_annotations`: a note may refer to the whole
     * material (`page_number` null) or a specific page, and is not drawn
     * onto the PDF itself. `note_type` is constrained at the validation
     * layer (MaterialNoteRequest) to general|exam|concept|question|formula.
     */
    public function up(): void
    {
        Schema::create('material_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('material_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('page_number')->nullable();
            $table->string('title');
            $table->text('content');
            $table->string('note_type')->default('general');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('material_notes');
    }
};
