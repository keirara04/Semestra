<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable([
    'type', 'subject_type', 'subject_id', 'idempotency_key', 'channel',
    'status', 'message', 'payload', 'sent_at', 'read_at',
])]
class Notification extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'sent_at' => 'datetime',
            'read_at' => 'datetime',
        ];
    }
}
