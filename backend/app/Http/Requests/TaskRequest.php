<?php

namespace App\Http\Requests;

use App\Models\Task;
use App\Rules\OwnedExists;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;

class TaskRequest extends FormRequest
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
            'assessment_id' => ['nullable', 'integer', OwnedExists::make('assessments', 'id')],
            'milestone_id' => ['nullable', 'integer', OwnedExists::make('milestones', 'id')],
            'topic_id' => ['nullable', 'integer'],
            'depends_on_task_id' => ['nullable', 'integer', OwnedExists::make('tasks', 'id')],
            'title' => [$required, 'string', 'max:255'],
            'estimated_minutes' => ['nullable', 'integer', 'min:0'],
            'remaining_estimate_minutes' => ['nullable', 'integer', 'min:0'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:255'],
            'status' => ['sometimes', 'string', 'in:open,done,skipped'],
            'due_at' => ['nullable', 'date'],
        ];
    }

    /**
     * Dependency cycles are rejected at creation/update time, see
     * Task::wouldCreateCycle and "Ranking" in the plan.
     */
    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            $dependsOnId = $this->input('depends_on_task_id');
            if ($dependsOnId === null) {
                return;
            }

            $taskId = $this->route('task')?->id;

            if (Task::wouldCreateCycle($taskId, (int) $dependsOnId)) {
                $validator->errors()->add('depends_on_task_id', 'This dependency would create a cycle.');
            }
        });
    }
}
