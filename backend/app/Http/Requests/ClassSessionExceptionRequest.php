<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClassSessionExceptionRequest extends FormRequest
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
            'class_session_id' => [$required, 'integer', 'exists:class_sessions,id'],
            'date' => [$required, 'date'],
            'type' => [$required, 'string', 'in:cancelled,moved'],
            'new_start_time' => ['nullable', 'date_format:H:i', 'required_if:type,moved'],
            'new_end_time' => ['nullable', 'date_format:H:i', 'after:new_start_time', 'required_if:type,moved'],
            'new_location' => ['nullable', 'string', 'max:255'],
        ];
    }
}
