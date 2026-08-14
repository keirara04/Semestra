<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnnotationSyncRequest extends FormRequest
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
            'upsert' => ['sometimes', 'array'],
            'upsert.*.id' => ['required', 'uuid'],
            'upsert.*.page_number' => ['required', 'integer', 'min:1'],
            'upsert.*.type' => ['required', 'string', 'in:drawing,highlight,text'],
            'upsert.*.data' => ['required', 'array'],
            'upsert.*.updated_at' => ['nullable', 'date'],
            'delete' => ['sometimes', 'array'],
            'delete.*' => ['uuid'],
        ];
    }
}
