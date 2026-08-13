<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SyllabusDraftConfirmRequest extends FormRequest
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
            'assessments' => ['array'],
            'assessments.*.title' => ['required', 'string', 'max:255'],
            'assessments.*.type' => ['required', 'string', 'in:report,quiz,lab,project,participation,midterm,final,exam,other'],
            'assessments.*.due_at' => ['required', 'date'],
            'tasks' => ['array'],
            'tasks.*.title' => ['required', 'string', 'max:255'],
            'tasks.*.estimated_minutes' => ['nullable', 'integer', 'min:0'],
            'tasks.*.assessment_index' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
