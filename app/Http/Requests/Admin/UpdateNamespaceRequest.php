<?php

namespace App\Http\Requests\Admin;

use App\Models\PostNamespace;
use App\Support\ReservedContentPath;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNamespaceRequest extends FormRequest
{
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
    /**
     * @return array<int, int>
     */
    private function descendantIds(int $namespaceId): array
    {
        $childIds = PostNamespace::query()
            ->where('parent_id', $namespaceId)
            ->pluck('id')
            ->all();

        $result = $childIds;

        foreach ($childIds as $childId) {
            $result = array_merge($result, $this->descendantIds($childId));
        }

        return $result;
    }

    public function rules(): array
    {
        return [
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('namespaces', 'id'),
                Rule::notIn([$this->route('namespace')->getKey()]),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null) {
                        return;
                    }

                    if (in_array((int) $value, $this->descendantIds($this->route('namespace')->getKey()), true)) {
                        $fail('The selected parent is a descendant of this namespace.');
                    }
                },
            ],
            'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::notIn(ReservedContentPath::rootSegments()), Rule::unique('namespaces', 'slug')->ignore($this->route('namespace'))],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'image', 'max:2048'],
            'is_published' => ['boolean'],
        ];
    }
}
