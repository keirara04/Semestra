<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['title', 'type', 'day_of_week', 'date', 'start_time', 'end_time'])]
class Commitment extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'date' => 'date',
        ];
    }
}
