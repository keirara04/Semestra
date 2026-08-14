<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MaterialStateRequest extends FormRequest
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
            'last_page' => ['nullable', 'integer', 'min:1'],
            'zoom' => ['nullable', 'numeric', 'min:0.1', 'max:10'],
        ];
    }
}
