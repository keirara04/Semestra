<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MaterialRequest extends FormRequest
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
            'type' => [$required, 'string', 'in:slide,pdf,reading,recording,link'],
            'title' => [$required, 'string', 'max:255'],
            'week' => ['nullable', 'integer', 'min:1', 'max:52'],
            // A material is either an uploaded file or an external link —
            // at least one is required on create; neither is editable
            // after creation (delete + re-create to replace, see
            // MaterialController).
            'file' => [$this->isMethod('POST') ? 'required_without:url' : 'prohibited', 'nullable', 'file', 'max:20480'],
            'url' => ['nullable', 'string', 'max:2048', $this->isMethod('POST') ? 'required_without:file' : 'prohibited'],
            'assessment_ids' => ['sometimes', 'array'],
            'assessment_ids.*' => ['integer', 'exists:assessments,id'],
        ];
    }
}
