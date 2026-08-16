<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class GradeItemRequest extends FormRequest
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
            'grade_category_id' => ['nullable', 'integer', OwnedExists::make('grade_categories', 'id')],
            'name' => [$required, 'string', 'max:255'],
            'weighting' => [$required, 'numeric', 'min:0', 'max:100'],
            'max_score' => ['nullable', 'numeric', 'min:0'],
            'achieved_score' => ['nullable', 'numeric', 'min:0'],
            'pass_hurdle_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
