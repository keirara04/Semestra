<?php

namespace App\Rules;

use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * Plain `exists:table,column` runs on the raw query builder and bypasses
 * BelongsToUser's global scope (see app/Models/Concerns/BelongsToUser.php)
 * — a request can reference another user's row by id and the validator
 * happily accepts it, since it only checks the row exists somewhere, not
 * that the caller owns it. Every foreign-key `exists` rule referencing a
 * BelongsToUser-scoped table should use this instead.
 */
class OwnedExists
{
    public static function make(string $table, string $column = 'id'): Exists
    {
        return Rule::exists($table, $column)->where('user_id', Auth::id());
    }
}
