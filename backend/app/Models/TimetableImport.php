<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['semester_id', 'source_url', 'status', 'payload'])]
class TimetableImport extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }
}
