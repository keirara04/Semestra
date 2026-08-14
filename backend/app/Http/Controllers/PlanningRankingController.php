<?php

namespace App\Http\Controllers;

use App\Services\RankingReader;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Thin controller, see App\Services\RankingReader for the shared,
 * read-only ranking pipeline (also used by TodayController).
 */
class PlanningRankingController extends Controller
{
    public function __invoke(Request $request, RankingReader $reader): JsonResponse
    {
        $ranking = $reader->rank($request->user());

        return response()->json([
            'ranking' => array_map(fn ($result) => $result->toArray(), $ranking),
        ]);
    }
}
