<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MaterialRequest extends FormRequest
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
            'course_id' => [$required, 'integer', 'exists:courses,id'],
            'type' => [$required, 'string', 'in:slide,pdf,reading,recording,link'],
            'title' => [$required, 'string', 'max:255'],
            'week' => ['nullable', 'integer', 'min:1', 'max:52'],
            // A material is either an uploaded file or an external link;
            // at least one is required on create; neither is editable
            // after creation (delete + re-create to replace, see
            // MaterialController).
            // Whitelisted to course-material formats only — anything that
            // can carry active content (html, svg, js, ...) is rejected.
            // The `public` disk (default in dev; `spaces` in prod, see
            // config/materials.php) serves uploads unauthenticated and
            // straight off disk, bypassing MaterialController entirely, so
            // an uploaded .html would execute as same-origin script for
            // anyone with the link — this rule is the only thing stopping
            // that, `mimes` and `mimetypes` both check the file's actual
            // bytes, not the client-supplied filename/Content-Type.
            'file' => [
                $this->isMethod('POST') ? 'required_without:url' : 'prohibited',
                'nullable',
                'file',
                'max:20480',
                'mimes:pdf,doc,docx,ppt,pptx,key,odp,jpg,jpeg,png,gif,mp4,mp3,m4a,wav,txt',
                'mimetypes:application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.apple.keynote,application/vnd.oasis.opendocument.presentation,image/jpeg,image/png,image/gif,video/mp4,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,text/plain',
            ],
            'url' => ['nullable', 'string', 'max:2048', $this->isMethod('POST') ? 'required_without:file' : 'prohibited'],
            'assessment_ids' => ['sometimes', 'array'],
            'assessment_ids.*' => ['integer', 'exists:assessments,id'],
        ];
    }
}
