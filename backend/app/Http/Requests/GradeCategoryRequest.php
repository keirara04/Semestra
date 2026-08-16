<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class GradeCategoryRequest extends FormRequest
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
            'name' => [$required, 'string', 'max:255'],
            'drop_lowest_count' => ['nullable', 'integer', 'min:0'],
            'best_n' => ['nullable', 'integer', 'min:1'],
            'best_of_m' => ['nullable', 'integer', 'min:1', 'gte:best_n'],
        ];
    }
}
