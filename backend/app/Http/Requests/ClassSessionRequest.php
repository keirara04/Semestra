<?php

namespace App\Http\Requests;

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
            'course_id' => [$required, 'integer', 'exists:courses,id'],
            'type' => [$required, 'string', 'in:lecture,tutorial,lab,exam'],
            'day_of_week' => [$required, 'integer', 'between:0,6'],
            'start_time' => [$required, 'date_format:H:i'],
            'end_time' => [$required, 'date_format:H:i', 'after:start_time'],
            'location' => ['nullable', 'string', 'max:255'],
        ];
    }
}
