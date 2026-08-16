<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class TopicRequest extends FormRequest
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
            'title' => [$required, 'string', 'max:255'],
            'confidence' => ['sometimes', 'string', 'in:not_started,learning,comfortable,confident'],
            'last_reviewed_at' => ['nullable', 'date'],
            'next_review_at' => ['nullable', 'date'],
            'assessment_ids' => ['sometimes', 'array'],
            'assessment_ids.*' => ['integer', OwnedExists::make('assessments', 'id')],
            'material_ids' => ['sometimes', 'array'],
            'material_ids.*' => ['integer', OwnedExists::make('materials', 'id')],
        ];
    }
}
