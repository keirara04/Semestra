<?php

namespace App\Http\Controllers;

use App\Models\StudyPlan;
use Illuminate\Http\JsonResponse;

/**
 * "Every planner run is versioned" — see "Core data model" in
 * mdfile/semester-command-center.md. Lets the frontend answer "why did it
 * suggest this yesterday" even after tasks/grades have since changed.
 */
class StudyPlanController extends Controller
{
    public function latest(): JsonResponse
    {
        $this->authorize('viewAny', StudyPlan::class);

        $plan = StudyPlan::latest('run_at')->first();

        return response()->json($plan);
    }
}
