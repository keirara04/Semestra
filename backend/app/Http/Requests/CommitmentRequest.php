<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CommitmentRequest extends FormRequest
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
            'title' => [$required, 'string', 'max:255'],
            'type' => [$required, 'string', 'in:sleep,meals,gym,prayer,commute,other'],
            'day_of_week' => ['nullable', 'integer', 'between:0,6', 'required_without:date'],
            'date' => ['nullable', 'date', 'required_without:day_of_week'],
            'start_time' => [$required, 'date_format:H:i'],
            'end_time' => [$required, 'date_format:H:i', 'after:start_time'],
        ];
    }
}
