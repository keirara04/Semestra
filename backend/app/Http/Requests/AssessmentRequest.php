<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class AssessmentRequest extends FormRequest
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
            'grade_item_id' => ['nullable', 'integer', OwnedExists::make('grade_items', 'id')],
            'type' => [$required, 'string', 'in:report,quiz,lab,project,participation,midterm,final,exam,other'],
            'title' => [$required, 'string', 'max:255'],
            'due_at' => [$required, 'date'],
            'status' => ['sometimes', 'string', 'in:not_started,in_progress,blocked,done'],
            'submission_url' => ['nullable', 'string', 'max:2048'],
            'estimated_minutes' => ['nullable', 'integer', 'min:0'],
            'group_members' => ['nullable', 'array'],
            'group_members.*' => ['string', 'max:255'],
            'links' => ['nullable', 'array'],
            'links.*' => ['string', 'max:2048'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
