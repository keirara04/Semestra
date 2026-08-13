<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Storage;

#[Fillable(['course_id', 'type', 'title', 'disk', 'path', 'url', 'week', 'mime_type', 'size_bytes'])]
class Material extends Model
{
    use BelongsToUser, HasFactory;

    protected $appends = ['file_url'];

    protected function casts(): array
    {
        return [
            'week' => 'integer',
            'size_bytes' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Public URL for an uploaded file, distinct from `url` (which is only
     * set for external link-type materials).
     */
    protected function fileUrl(): Attribute
    {
        return Attribute::get(fn () => $this->path ? Storage::disk($this->disk)->url($this->path) : null);
    }

    public function assessments(): BelongsToMany
    {
        return $this->belongsToMany(Assessment::class);
    }

    public function topics(): BelongsToMany
    {
        return $this->belongsToMany(Topic::class, 'topic_material');
    }
}
