<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
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
            'task_id' => ['nullable', 'integer', OwnedExists::make('tasks', 'id')],
            'type' => ['sometimes', 'string', 'in:lecture,commitment,study'],
            // "suggested" is a planner-only status; the API never lets a
            // student set it directly, only PlanningRunController writes
            // it. accepted/skipped/done/moved are all real student actions.
            'status' => ['sometimes', 'string', 'in:accepted,skipped,done,moved'],
            'title' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'remind_at' => ['nullable', 'date'],
            'start_at' => [$required, 'date'],
            'end_at' => [$required, 'date', 'after:start_at'],
            // Create-only ("repeat weekly until"): CalendarBlockController
            // strips this before the update path ever sees it, so sending
            // it on a PUT is silently ignored rather than resurrecting
            // recurrence generation on an edit.
            'recurrence_until' => ['nullable', 'date', 'after_or_equal:start_at'],
        ];
    }
}
