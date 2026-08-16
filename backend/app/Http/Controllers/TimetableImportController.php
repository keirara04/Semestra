<?php

namespace App\Http\Controllers;

use App\Http\Requests\TimetableImportConfirmRequest;
use App\Http\Requests\TimetableImportRequest;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\TimetableImport;
use App\Services\EverytimeImportService;
use App\Services\EverytimeParseException;
use Illuminate\Http\JsonResponse;

/**
 * Same "nothing is saved automatically" shape as SyllabusDraftController:
 * store() only ever creates a TimetableImport (the parsed subjects, as a
 * draft); confirm() is the only place real Course/ClassSession rows get
 * created, and only for the subjects still present in the request body
 * (the student may have edited or dropped rows in the review UI).
 */
class TimetableImportController extends Controller
{
    public function store(TimetableImportRequest $request, EverytimeImportService $importer): JsonResponse
    {
        $this->authorize('create', TimetableImport::class);

        try {
            $subjects = $importer->fetchSubjects($request->string('url')->toString());
        } catch (EverytimeParseException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $import = TimetableImport::create([
            'semester_id' => $request->integer('semester_id'),
            'source_url' => $request->string('url')->toString(),
            'status' => 'pending',
            'payload' => $subjects,
        ]);

        return response()->json($import, 201);
    }

    public function confirm(TimetableImportConfirmRequest $request, TimetableImport $import): JsonResponse
    {
        $this->authorize('update', $import);

        foreach ($request->input('subjects', []) as $subject) {
            $courseId = $subject['course_id'] ?? null;

            if (! $courseId) {
                $existing = Course::where('semester_id', $import->semester_id)
                    ->whereRaw('lower(title) = ?', [mb_strtolower($subject['new_course']['title'])])
                    ->first();

                $courseId = $existing?->id ?? Course::create([
                    'semester_id' => $import->semester_id,
                    'title' => $subject['new_course']['title'],
                    'colour' => $subject['new_course']['colour'],
                ])->id;
            }

            // Re-importing the same (or an overlapping) share link must be
            // idempotent — skip a session that already matches this
            // course's day/time exactly rather than creating a duplicate.
            $alreadyExists = ClassSession::where('course_id', $courseId)
                ->where('day_of_week', $subject['day_of_week'])
                ->where('start_time', $subject['start_time'])
                ->where('end_time', $subject['end_time'])
                ->exists();

            if ($alreadyExists) {
                continue;
            }

            ClassSession::create([
                'course_id' => $courseId,
                'type' => 'lecture',
                'day_of_week' => $subject['day_of_week'],
                'start_time' => $subject['start_time'],
                'end_time' => $subject['end_time'],
                'location' => $subject['location'] ?? null,
            ]);
        }

        $import->update(['status' => 'confirmed']);

        return response()->json($import);
    }

    public function discard(TimetableImport $import): JsonResponse
    {
        $this->authorize('update', $import);

        $import->update(['status' => 'discarded']);

        return response()->json($import);
    }
}
