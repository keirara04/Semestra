<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CalendarBlockRequest extends FormRequest
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
            'task_id' => ['nullable', 'integer', 'exists:tasks,id'],
            'type' => ['sometimes', 'string', 'in:lecture,commitment,study'],
            // suggested/moved are planner-only statuses (Planning Engine
            // release) — this release only ever writes manual statuses.
            'status' => ['sometimes', 'string', 'in:accepted,skipped,done'],
            'title' => ['nullable', 'string', 'max:255'],
            'start_at' => [$required, 'date'],
            'end_at' => [$required, 'date', 'after:start_at'],
        ];
    }
}
