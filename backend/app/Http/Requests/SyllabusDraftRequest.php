<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Contracts\Validation\Validator as ValidatorContract;
use Illuminate\Foundation\Http\FormRequest;

class SyllabusDraftRequest extends FormRequest
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
            'material_id' => ['nullable', 'integer', OwnedExists::make('materials', 'id')],
            'pasted_text' => ['nullable', 'string'],
        ];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            if (! $this->filled('material_id') && ! $this->filled('pasted_text')) {
                $validator->errors()->add('pasted_text', 'Provide either a material_id or pasted_text.');
            }
        });
    }
}
