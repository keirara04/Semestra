<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * App-layer ownership scoping — see "Technical direction" (Authorization
 * model) in mdfile/semester-command-center.md. Laravel has no Supabase-style
 * RLS, so every user-owned model applies this trait: queries are always
 * scoped to the authenticated user, and new records get user_id set
 * automatically. Pair with a Policy on the controller action, not instead of.
 */
trait BelongsToUser
{
    protected static function bootBelongsToUser(): void
    {
        static::addGlobalScope('owned_by_user', function (Builder $builder) {
            if ($user = Auth::user()) {
                $builder->where($builder->getModel()->getTable().'.user_id', $user->id);
            }
        });

        static::creating(function ($model) {
            if (! $model->user_id && $user = Auth::user()) {
                $model->user_id = $user->id;
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
