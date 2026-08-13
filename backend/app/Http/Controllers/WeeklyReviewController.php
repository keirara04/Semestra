<?php

namespace App\Http\Controllers;

use App\Models\WeeklyReview;
use Illuminate\Http\JsonResponse;

class WeeklyReviewController extends Controller
{
    public function latest(): JsonResponse
    {
        $this->authorize('viewAny', WeeklyReview::class);

        $review = WeeklyReview::latest('week_start_date')->first();

        return response()->json($review);
    }
}
