<?php

namespace App\Http\Requests\Admin;

use App\Support\ContentPathConflict;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePostRequest extends FormRequest
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
                Rule::unique('posts', 'slug')->where('namespace_id', $namespaceId),
            ],
            'content' => ['required', 'string'],
            'is_draft' => ['boolean'],
            'published_at' => ['nullable', 'date'],
            'reference_title' => ['nullable', 'string', 'max:255'],
            'reference_url' => ['nullable', 'url', 'max:2048'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->has('slug')) {
                    return;
                }

                $namespace = $this->route('namespace');

                if ($namespace === null) {
                    return;
                }

                $conflictPath = ContentPathConflict::findPostConflict(
                    $namespace->id,
                    (string) $this->input('slug'),
                );

                if ($conflictPath !== null) {
                    $validator->errors()->add(
                        'slug',
                        "This slug is already used by another page or child namespace at /{$conflictPath}.",
                    );
                }
            },
        ];
    }
}
