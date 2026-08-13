<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['assessment_id', 'title', 'estimate_minutes', 'done', 'order'])]
class Milestone extends Model
{
    use BelongsToUser, HasFactory;

    protected function casts(): array
    {
        return [
            'done' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Authored estimate wins; falls back to the sum of this milestone's
     * task estimates when left blank (see "Core data model" in the plan).
     */
    protected function effectiveEstimateMinutes(): Attribute
    {
        return Attribute::get(fn () => $this->estimate_minutes
            ?? (int) $this->tasks()->sum('estimated_minutes'));
    }
}
