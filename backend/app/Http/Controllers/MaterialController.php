<?php

namespace App\Http\Controllers;

use App\Http\Requests\MaterialRequest;
use App\Models\Material;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class MaterialController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Material::class);

        return response()->json(Material::orderBy('title')->get());
    }

    public function store(MaterialRequest $request): JsonResponse
    {
        $this->authorize('create', Material::class);

        $validated = $request->validated();
        $attributes = collect($validated)->except(['file', 'assessment_ids'])->all();

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $disk = config('materials.disk');
            $path = $file->store('materials/'.$request->user()->id, $disk);

            $attributes['disk'] = $disk;
            $attributes['path'] = $path;
            $attributes['mime_type'] = $file->getClientMimeType();
            $attributes['size_bytes'] = $file->getSize();
        }

        $material = Material::create($attributes);

        if (isset($validated['assessment_ids'])) {
            $material->assessments()->sync($validated['assessment_ids']);
        }

        return response()->json($material->load('assessments'), 201);
    }

    public function show(Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        return response()->json($material->load('assessments'));
    }

    public function update(MaterialRequest $request, Material $material): JsonResponse
    {
        $this->authorize('update', $material);

        $validated = $request->validated();
        $attributes = collect($validated)->except(['file', 'url', 'assessment_ids'])->all();

        $material->update($attributes);

        if (isset($validated['assessment_ids'])) {
            $material->assessments()->sync($validated['assessment_ids']);
        }

        return response()->json($material->fresh('assessments'));
    }

    public function destroy(Material $material): JsonResponse
    {
        $this->authorize('delete', $material);

        if ($material->disk && $material->path) {
            Storage::disk($material->disk)->delete($material->path);
        }

        $material->delete();

        return response()->json(status: 204);
    }
}
