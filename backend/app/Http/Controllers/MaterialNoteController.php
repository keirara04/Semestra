<?php

namespace App\Http\Controllers;

use App\Http\Requests\MaterialNoteRequest;
use App\Models\Material;
use App\Models\MaterialNote;
use Illuminate\Http\JsonResponse;

class MaterialNoteController extends Controller
{
    public function index(Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        return response()->json(
            MaterialNote::where('material_id', $material->id)->orderBy('created_at')->get(),
        );
    }

    public function store(MaterialNoteRequest $request, Material $material): JsonResponse
    {
        $this->authorize('update', $material);

        $note = MaterialNote::create([...$request->validated(), 'material_id' => $material->id]);

        return response()->json($note, 201);
    }

    public function update(MaterialNoteRequest $request, MaterialNote $note): JsonResponse
    {
        $this->authorize('update', $note);

        $note->update($request->validated());

        return response()->json($note);
    }

    public function destroy(MaterialNote $note): JsonResponse
    {
        $this->authorize('delete', $note);

        $note->delete();

        return response()->json(status: 204);
    }
}
