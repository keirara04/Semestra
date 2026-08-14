<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Composite key (user_id, material_id), no surrogate id column — see the
 * migration doc comment. Deliberately does NOT use BelongsToUser (that
 * trait assumes a single-column `id` primary key for its global scope to
 * pair with route-model binding); reads/writes here always go through
 * explicit `where('user_id', ...)` queries or `updateOrInsert()` instead of
 * find()/save() on a fetched instance, so no per-row ownership scope is
 * needed.
 */
#[Fillable(['user_id', 'material_id', 'last_opened_at', 'last_page', 'zoom'])]
class UserMaterialState extends Model
{
    public $incrementing = false;

    protected $primaryKey = null;

    protected function casts(): array
    {
        return [
            'last_opened_at' => 'datetime',
            'last_page' => 'integer',
            'zoom' => 'decimal:2',
        ];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}
