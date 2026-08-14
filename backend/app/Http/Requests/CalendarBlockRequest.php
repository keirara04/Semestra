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
            // "suggested" is a planner-only status; the API never lets a
            // student set it directly, only PlanningRunController writes
            // it. accepted/skipped/done/moved are all real student actions.
            'status' => ['sometimes', 'string', 'in:accepted,skipped,done,moved'],
            'title' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'start_at' => [$required, 'date'],
            'end_at' => [$required, 'date', 'after:start_at'],
        ];
    }
}
