<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['material_id', 'page_number', 'title', 'content', 'note_type'])]
class MaterialNote extends Model
{
    use BelongsToUser, HasFactory;

    public const NOTE_TYPES = ['general', 'exam', 'concept', 'question', 'formula'];

    protected function casts(): array
    {
        return [
            'page_number' => 'integer',
        ];
    }

    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }
}
