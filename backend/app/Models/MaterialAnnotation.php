<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['client_uuid', 'material_id', 'page_number', 'type', 'data'])]
class MaterialAnnotation extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'page_number' => 'integer',
            'data' => 'array',
            'deleted_at' => 'datetime',
        ];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}
