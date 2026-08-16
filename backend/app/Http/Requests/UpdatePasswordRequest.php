<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator as ValidatorContract;

class UpdatePasswordRequest extends FormRequest
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
            'current_password' => ['required', 'string'],
            // Same rule object as RegisterRequest, so password strength
            // can never drift between signup and change.
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }

    public function withValidator(ValidatorContract $validator): void
    {
        $validator->after(function (ValidatorContract $validator) {
            if (! Hash::check($this->input('current_password'), $this->user()->password)) {
                $validator->errors()->add('current_password', 'Incorrect password.');

                return;
            }

            if (Hash::check($this->input('password'), $this->user()->password)) {
                $validator->errors()->add('password', 'New password must be different from your current password.');
            }
        });
    }
}
