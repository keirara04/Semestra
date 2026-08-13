<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['date', 'requests_count', 'tokens_used'])]
class AiUsage extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }
}
