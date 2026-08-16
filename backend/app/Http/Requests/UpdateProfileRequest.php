<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
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
            'name' => ['sometimes', 'string', 'max:255'],
            'timezone' => ['sometimes', 'string', 'timezone'],
            'max_study_hours_per_day' => ['sometimes', 'integer', 'min:1', 'max:24'],
            'grade_scale' => ['sometimes', 'string', 'max:20'],
            'deep_work_windows' => ['sometimes', 'nullable', 'array'],
            'deep_work_windows.*.start' => ['required_with:deep_work_windows', 'date_format:H:i'],
            'deep_work_windows.*.end' => ['required_with:deep_work_windows', 'date_format:H:i', 'after:deep_work_windows.*.start'],
            'quiet_hours' => ['sometimes', 'nullable', 'array'],
            'quiet_hours.start' => ['required_with:quiet_hours', 'date_format:H:i'],
            'quiet_hours.end' => ['required_with:quiet_hours', 'date_format:H:i'],
        ];
    }
}
