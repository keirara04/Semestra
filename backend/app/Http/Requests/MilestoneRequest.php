<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class MilestoneRequest extends FormRequest
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
            'assessment_id' => [$required, 'integer', OwnedExists::make('assessments', 'id')],
            'title' => [$required, 'string', 'max:255'],
            'estimate_minutes' => ['nullable', 'integer', 'min:0'],
            'done' => ['sometimes', 'boolean'],
            'order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
