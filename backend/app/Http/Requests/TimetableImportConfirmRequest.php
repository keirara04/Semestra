<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;

class TimetableImportConfirmRequest extends FormRequest
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
            'subjects' => ['required', 'array', 'min:1'],
            'subjects.*.title' => ['required', 'string', 'max:255'],
            'subjects.*.day_of_week' => ['required', 'integer', 'min:0', 'max:6'],
            'subjects.*.start_time' => ['required', 'date_format:H:i'],
            'subjects.*.end_time' => ['required', 'date_format:H:i', 'after:subjects.*.start_time'],
            'subjects.*.location' => ['nullable', 'string', 'max:255'],
            'subjects.*.course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'subjects.*.new_course' => ['nullable', 'array'],
            'subjects.*.new_course.title' => ['required_with:subjects.*.new_course', 'string', 'max:255'],
            'subjects.*.new_course.colour' => ['required_with:subjects.*.new_course', 'string', 'max:20'],
        ];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            foreach ($this->input('subjects', []) as $index => $subject) {
                if (empty($subject['course_id']) && empty($subject['new_course'])) {
                    $validator->errors()->add(
                        "subjects.$index",
                        'Each subject needs either an existing course_id or a new_course.',
                    );
                }
            }
        });
    }
}
