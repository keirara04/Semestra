<?php

namespace App\Http\Controllers;

use App\Http\Requests\MaterialStateRequest;
use App\Models\Material;
use App\Models\UserMaterialState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialStateController extends Controller
{
    public function show(Request $request, Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        $state = UserMaterialState::where('user_id', $request->user()->id)
            ->where('material_id', $material->id)
            ->first();

        return response()->json($state ?? [
            'user_id' => $request->user()->id,
            'material_id' => $material->id,
            'last_opened_at' => null,
            'last_page' => null,
            'zoom' => null,
        ]);
    }

    public function update(MaterialStateRequest $request, Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        $values = array_filter($request->validated(), fn ($value) => $value !== null);
        $values['updated_at'] = now();

        UserMaterialState::query()->updateOrInsert(
            ['user_id' => $request->user()->id, 'material_id' => $material->id],
            $values,
        );

        $state = UserMaterialState::where('user_id', $request->user()->id)
            ->where('material_id', $material->id)
            ->first();

        return response()->json($state);
    }
}
