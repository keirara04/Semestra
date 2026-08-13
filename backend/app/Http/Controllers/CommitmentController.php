<?php

namespace App\Http\Controllers;

use App\Http\Requests\CommitmentRequest;
use App\Models\Commitment;
use Illuminate\Http\JsonResponse;

class CommitmentController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Commitment::class);

        return response()->json(Commitment::orderBy('start_time')->get());
    }

    public function store(CommitmentRequest $request): JsonResponse
    {
        $this->authorize('create', Commitment::class);

        $commitment = Commitment::create($request->validated());

        return response()->json($commitment, 201);
    }

    public function show(Commitment $commitment): JsonResponse
    {
        $this->authorize('view', $commitment);

        return response()->json($commitment);
    }

    public function update(CommitmentRequest $request, Commitment $commitment): JsonResponse
    {
        $this->authorize('update', $commitment);

        $commitment->update($request->validated());

        return response()->json($commitment);
    }

    public function destroy(Commitment $commitment): JsonResponse
    {
        $this->authorize('delete', $commitment);

        $commitment->delete();

        return response()->json(status: 204);
    }
}
