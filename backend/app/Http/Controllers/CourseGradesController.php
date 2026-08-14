<?php

namespace App\Http\Controllers;

use App\Engine\Grade\GradeCalculator;
use App\Engine\Grade\GradeCategoryInput;
use App\Engine\Grade\GradeItemInput;
use App\Models\Course;
use App\Models\GradeCategory;
use Illuminate\Http\JsonResponse;

/**
 * Thin controller, all the actual math lives in App\Engine\Grade
 * (framework-agnostic, no Eloquent), per "Planning engine boundary" in
 * mdfile/semester-command-center.md.
 */
class CourseGradesController extends Controller
{
    public function __invoke(Course $course, GradeCalculator $calculator): JsonResponse
    {
        $this->authorize('view', $course);

        $items = $course->gradeItems()->get()->map(
            fn ($item) => new GradeItemInput(
                $item->id,
                $item->name,
                (float) $item->weighting,
                (float) $item->max_score,
                $item->achieved_score !== null ? (float) $item->achieved_score : null,
                $item->grade_category_id,
                $item->pass_hurdle_percent !== null ? (float) $item->pass_hurdle_percent : null,
            ),
        )->all();

        $categories = GradeCategory::where('course_id', $course->id)->get()->map(
            fn (GradeCategory $category) => new GradeCategoryInput(
                $category->id,
                $category->drop_lowest_count,
                $category->best_n,
            ),
        )->all();

        // Course.grade_target is a free-text field ("A", "85", "85%"); only
        // a parseable numeric percentage feeds "expected"/"needed average";
        // anything else means those two stay null (see "Incomplete grade
        // information" empty state: distinguish unknown from zero).
        $targetPercent = null;
        if ($course->grade_target !== null && preg_match('/\d+(\.\d+)?/', $course->grade_target, $matches)) {
            $targetPercent = (float) $matches[0];
        }

        $report = $calculator->calculate($items, $categories, $targetPercent);

        return response()->json($report->toArray());
    }
}
