<?php

namespace App\Http\Requests;

use App\Models\MaterialNote;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MaterialNoteRequest extends FormRequest
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
            'content' => [$required, 'string'],
            'note_type' => [$required, 'string', Rule::in(MaterialNote::NOTE_TYPES)],
            'page_number' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
