<?php

namespace App\Http\Requests\Admin;

use App\Support\ContentPathConflict;
use App\Support\ReservedContentPath;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreNamespaceRequest extends FormRequest
{
    private function parentId(): ?int
    {
        $parentId = $this->input('parent_id');

        if ($parentId === null || $parentId === '') {
            return null;
        }

        return (int) $parentId;
    }

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('parent_id') === '') {
            $this->merge([
                'parent_id' => null,
            ]);
        }

        if ($this->has('is_published')) {
            $this->merge([
                'is_published' => $this->boolean('is_published'),
            ]);
        }
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'integer', Rule::exists('namespaces', 'id')],
            'slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                Rule::notIn(ReservedContentPath::rootSegments()),
                Rule::unique('namespaces', 'slug')->where(function ($query) {
                    return $this->parentId() === null
                        ? $query->whereNull('parent_id')
                        : $query->where('parent_id', $this->parentId());
                }),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'image', 'max:2048'],
            'is_published' => ['boolean'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->hasAny(['parent_id', 'slug'])) {
                    return;
                }

                $conflictPath = ContentPathConflict::findNamespaceConflict(
                    $this->parentId(),
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
