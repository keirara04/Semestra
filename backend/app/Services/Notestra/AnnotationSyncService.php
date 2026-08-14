<?php

namespace App\Services\Notestra;

use App\Models\Material;
use App\Models\MaterialAnnotation;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Batched annotation autosave — see mdfile/NOTESTRA_FUNCTIONAL_SPEC.md,
 * Section 19 ("Batched annotation sync"). A single debounced client save can
 * carry several strokes plus a delete; this runs the whole batch as one
 * transaction so it either fully lands or fully rolls back, and returns the
 * canonical server timestamps the client uses to clear its dirty set.
 */
class AnnotationSyncService
{
    /**
     * @param  array<int, array{id: string, page_number: int, type: string, data: array, updated_at?: string}>  $upserts
     * @param  array<int, string>  $deleteClientUuids
     * @return array<int, array{id: string, updated_at: string}>
     */
    public function sync(Material $material, User $user, array $upserts, array $deleteClientUuids): array
    {
        return DB::transaction(function () use ($material, $user, $upserts, $deleteClientUuids) {
            $synced = [];

            foreach ($upserts as $item) {
                $synced[] = $this->upsertOne($material, $user, $item);
            }

            if ($deleteClientUuids !== []) {
                MaterialAnnotation::where('material_id', $material->id)
                    ->whereIn('client_uuid', $deleteClientUuids)
                    ->update(['deleted_at' => now()]);
            }

            return $synced;
        });
    }

    /**
     * @param  array{id: string, page_number: int, type: string, data: array, updated_at?: string}  $item
     * @return array{id: string, updated_at: string}
     */
    private function upsertOne(Material $material, User $user, array $item): array
    {
        $existing = MaterialAnnotation::where('material_id', $material->id)
            ->where('client_uuid', $item['id'])
            ->first();

        if ($existing && ! empty($item['updated_at'])) {
            $clientKnown = Carbon::parse($item['updated_at']);

            if ($clientKnown->lt($existing->updated_at)) {
                throw new AnnotationConflictException(
                    "Annotation {$item['id']} was modified by another session.",
                );
            }
        }

        $attributes = [
            'material_id' => $material->id,
            'user_id' => $user->id,
            'page_number' => $item['page_number'],
            'type' => $item['type'],
            'data' => $item['data'],
            'deleted_at' => null,
        ];

        if ($existing) {
            $existing->update($attributes);
            $result = $existing;
        } else {
            $result = MaterialAnnotation::create(['client_uuid' => $item['id'], ...$attributes]);
        }

        return ['id' => $result->client_uuid, 'updated_at' => $result->updated_at->toIso8601String()];
    }
}
