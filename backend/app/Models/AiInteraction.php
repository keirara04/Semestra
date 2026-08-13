<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['intent', 'input_redacted', 'model', 'total_tokens', 'status'])]
class AiInteraction extends Model
{
    use BelongsToUser, HasFactory;
}
