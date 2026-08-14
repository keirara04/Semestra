<?php

namespace App\Http\Controllers;

use App\Services\PlanningRunner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Thin controller, see App\Services\PlanningRunner for the actual
 * pipeline orchestration, shared with the nightly scheduled command.
 */
class PlanningRunController extends Controller
{
    public function __invoke(Request $request, PlanningRunner $runner): JsonResponse
    {
        return response()->json($runner->run($request->user(), trigger: 'on_demand'));
    }
}
