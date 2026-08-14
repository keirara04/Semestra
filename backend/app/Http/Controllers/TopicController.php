<?php

namespace App\Http\Controllers;

use App\Engine\Revision\RevisionConstants;
use App\Http\Requests\TopicRequest;
use App\Models\Topic;
use Illuminate\Http\JsonResponse;

class TopicController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Topic::class);

        return response()->json(Topic::orderBy('title')->get());
    }

    public function store(TopicRequest $request): JsonResponse
    {
        $this->authorize('create', Topic::class);

        $validated = $request->validated();
        $attributes = collect($validated)->except(['assessment_ids', 'material_ids'])->all();
        $attributes['confidence'] ??= 'not_started';

        $topic = Topic::create($attributes);

        if (isset($validated['assessment_ids'])) {
            $topic->assessments()->sync($validated['assessment_ids']);
        }
        if (isset($validated['material_ids'])) {
            $topic->materials()->sync($validated['material_ids']);
        }

        return response()->json($topic->load('assessments', 'materials'), 201);
    }

    public function show(Topic $topic): JsonResponse
    {
        $this->authorize('view', $topic);

        return response()->json($topic->load('assessments', 'materials'));
    }

    public function update(TopicRequest $request, Topic $topic): JsonResponse
    {
        $this->authorize('update', $topic);

        $validated = $request->validated();

        // A confidence change made through review (not a raw edit) is what
        // sets last_reviewed_at, but a direct PUT is still the simplest
        // v1 mechanism for "I reviewed this," so it updates last_reviewed_at
        // automatically whenever confidence is explicitly provided. If
        // there's no schedule running yet (brand new topic, or a prior
        // cycle already completed), this is also what seeds the spaced
        // cadence; a mid-cycle confidence edit doesn't reset it.
        $attributes = collect($validated)->except(['assessment_ids', 'material_ids'])->all();
        if (array_key_exists('confidence', $attributes)) {
            $attributes['last_reviewed_at'] = $attributes['last_reviewed_at'] ?? now();

            if ($topic->next_review_at === null) {
                $attributes['review_stage'] = 0;
                $attributes['next_review_at'] = now()->addDays(RevisionConstants::INTERVAL_DAYS[0]);
                $attributes['missed_decay_applied_at'] = null;
            }
        }

        $topic->update($attributes);

        if (isset($validated['assessment_ids'])) {
            $topic->assessments()->sync($validated['assessment_ids']);
        }
        if (isset($validated['material_ids'])) {
            $topic->materials()->sync($validated['material_ids']);
        }

        return response()->json($topic->fresh(['assessments', 'materials']));
    }

    public function destroy(Topic $topic): JsonResponse
    {
        $this->authorize('delete', $topic);

        $topic->delete();

        return response()->json(status: 204);
    }
}
