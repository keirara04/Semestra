<?php

namespace App\Http\Controllers;

use App\Http\Requests\MaterialRequest;
use App\Models\Material;
use App\Models\UserMaterialState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

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

    /**
     * Signed viewer URL for Notestra, see
     * mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 4. Also touches
     * user_material_states.last_opened_at (Section 15) as a side effect of
     * opening the viewer.
     */
    public function viewUrl(Request $request, Material $material): JsonResponse
    {
        $this->authorize('view', $material);

        UserMaterialState::query()->updateOrInsert(
            ['user_id' => $request->user()->id, 'material_id' => $material->id],
            ['last_opened_at' => now(), 'updated_at' => now()],
        );

        return response()->json(['url' => $material->temporaryViewUrl()]);
    }

    /**
     * Signed streaming route backing temporaryViewUrl() on the local disk;
     * the Spaces branch returns a Storage-generated URL directly and never
     * hits this route. Auth is the URL signature itself (see the
     * "materials.stream" route definition, outside the auth:sanctum group).
     */
    public function stream(Request $request, Material $material): StreamedResponse
    {
        abort_unless($request->hasValidSignature(), 403);
        abort_unless($material->disk && $material->path, 404);

        return Storage::disk($material->disk)->response($material->path);
    }
}
