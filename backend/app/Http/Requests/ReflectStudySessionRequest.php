<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReflectStudySessionRequest extends FormRequest
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
            'outcome' => ['required', 'string', 'in:completed,partial,blocked,longer_than_estimated,easier_than_estimated'],
            'notes' => ['nullable', 'string'],
            'blocker' => ['nullable', 'string', 'required_if:outcome,blocked'],
            // Remaining effort only changes when the student confirms
            // progress here, never inferred from actual_minutes logged
            // (see "Edge cases" in the plan).
            'remaining_estimate_minutes' => ['nullable', 'integer', 'min:0'],
            'completion_percent' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }
}
