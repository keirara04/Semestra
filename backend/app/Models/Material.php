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
use Illuminate\Support\Facades\URL;

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

    /**
     * Disk-agnostic short-lived viewer URL for Notestra — see
     * mdfile/NOTESTRA_FUNCTIONAL_SPEC.md, Section 4. Callers (Notestra) never
     * need to know whether this material lives on Spaces or the local disk.
     */
    public function temporaryViewUrl(): string
    {
        if ($this->disk === 'spaces') {
            return Storage::disk('spaces')->temporaryUrl($this->path, now()->addMinutes(5));
        }

        return URL::temporarySignedRoute('materials.stream', now()->addMinutes(5), ['material' => $this->id]);
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
