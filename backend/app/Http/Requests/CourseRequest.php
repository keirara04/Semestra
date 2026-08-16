<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class CourseRequest extends FormRequest
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
            'semester_id' => [$required, 'integer', OwnedExists::make('semesters', 'id')],
            'title' => [$required, 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'colour' => [$required, 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'instructor' => ['nullable', 'string', 'max:255'],
            'credits' => ['nullable', 'integer', 'min:0', 'max:60'],
            'grade_target' => ['nullable', 'string', 'max:50'],
        ];
    }
}
