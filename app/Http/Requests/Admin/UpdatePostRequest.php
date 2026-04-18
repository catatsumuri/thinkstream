<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_draft')) {
            $this->merge([
                'is_draft' => $this->boolean('is_draft'),
            ]);
        }

        if ($this->input('published_at') === '') {
            $this->merge([
                'published_at' => null,
            ]);
        }

        if (! $this->boolean('is_draft') && $this->input('published_at') === null) {
            $this->merge([
                'published_at' => now()->toDateTimeString(),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $namespaceId = $this->route('namespace')?->id;

        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::unique('posts', 'slug')
                    ->where('namespace_id', $namespaceId)
                    ->ignore($this->route('post')),
            ],
            'content' => ['required', 'string'],
            'is_draft' => ['boolean'],
            'published_at' => ['nullable', 'date'],
        ];
    }
}
