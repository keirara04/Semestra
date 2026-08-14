<?php

namespace App\Http\Controllers;

use App\Models\Material;
use App\Models\MaterialAnnotation;
use Illuminate\Http\JsonResponse;

class MaterialAnnotationController extends Controller
{
    public function index(Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        return response()->json(
            MaterialAnnotation::where('material_id', $material->id)
                ->whereNull('deleted_at')
                ->get(),
        );
    }
}
