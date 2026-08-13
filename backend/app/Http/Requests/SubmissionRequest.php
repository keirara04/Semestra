<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmissionRequest extends FormRequest
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
            'assessment_id' => [$required, 'integer', 'exists:assessments,id'],
            'submitted_at' => ['nullable', 'date'],
            'url' => ['nullable', 'string', 'max:2048'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
