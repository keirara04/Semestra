<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnnotationSyncRequest;
use App\Models\Material;
use App\Services\Notestra\AnnotationConflictException;
use App\Services\Notestra\AnnotationSyncService;
use Illuminate\Http\JsonResponse;

class AnnotationSyncController extends Controller
{
    public function sync(AnnotationSyncRequest $request, Material $material, AnnotationSyncService $service): JsonResponse
    {
        $this->authorize('update', $material);

        try {
            $synced = $service->sync(
                $material,
                $request->user(),
                $request->input('upsert', []),
                $request->input('delete', []),
            );
        } catch (AnnotationConflictException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        return response()->json(['synced' => $synced]);
    }
}
