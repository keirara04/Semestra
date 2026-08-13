<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Defense-in-depth on top of BelongsToUser's global scope — see
 * "Authorization model" in the plan. The global scope already keeps
 * cross-user records out of query results, so ownership here is a second,
 * independent check rather than the only one.
 */
abstract class OwnedResourcePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Model $model): bool
    {
        return $model->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Model $model): bool
    {
        return $model->user_id === $user->id;
    }

    public function delete(User $user, Model $model): bool
    {
        return $model->user_id === $user->id;
    }
}
