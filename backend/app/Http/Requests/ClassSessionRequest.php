<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class ClassSessionRequest extends FormRequest
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
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'course_id' => [$required, 'integer', OwnedExists::make('courses', 'id')],
            'type' => [$required, 'string', 'in:lecture,tutorial,lab,exam'],
            'day_of_week' => [$required, 'integer', 'between:0,6'],
            'start_time' => [$required, 'date_format:H:i'],
            'end_time' => [$required, 'date_format:H:i', 'after:start_time'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'remind_minutes_before' => ['nullable', 'integer', 'min:0', 'max:10080'],
            'remind_recurring' => ['sometimes', 'boolean'],
        ];
    }
}
