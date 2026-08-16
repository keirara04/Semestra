<?php

namespace App\Http\Requests;

use App\Rules\OwnedExists;
use Illuminate\Foundation\Http\FormRequest;

class TimetableImportRequest extends FormRequest
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
            'semester_id' => ['required', 'integer', OwnedExists::make('semesters', 'id')],
            'url' => ['required', 'url', 'starts_with:https://everytime.kr/,https://www.everytime.kr/'],
        ];
    }
}
