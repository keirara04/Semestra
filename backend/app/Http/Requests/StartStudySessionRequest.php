<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class StartStudySessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'calendar_block_id' => ['required', 'integer', OwnedExists::make('calendar_blocks', 'id')],
            'planned_minutes' => ['required', 'integer', 'min:1'],
        ];
    }
}
