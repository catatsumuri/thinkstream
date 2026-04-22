<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreNamespaceRequest;
use App\Http\Requests\Admin\UpdateNamespaceRequest;
use App\Models\PostNamespace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class NamespaceController extends Controller
{
    public function reorder(Request $request): RedirectResponse
    {
        $ids = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'distinct', Rule::exists('namespaces', 'id')],
        ])['ids'];

        $caseStatement = collect($ids)
            ->values()
            ->map(fn (int $id, int $index): string => 'WHEN ? THEN ?')
            ->implode(' ');

        $bindings = [
            ...collect($ids)
                ->values()
                ->flatMap(fn (int $id, int $index): array => [$id, $index])
                ->all(),
            ...$ids,
        ];

        DB::update(
            "UPDATE namespaces SET sort_order = CASE id {$caseStatement} END WHERE id IN (".implode(', ', array_fill(0, count($ids), '?')).')',
            $bindings,
        );

        return back();
    }

    public function create(Request $request): InertiaResponse
    {
        $data = $request->validate([
            'parent' => ['nullable', 'integer', Rule::exists('namespaces', 'id')],
        ]);

        $parentNamespace = isset($data['parent'])
            ? PostNamespace::query()->find($data['parent'], ['id', 'name', 'full_path'])
            : null;

        return Inertia::render('admin/namespaces/create', [
            'parentNamespace' => $parentNamespace,
        ]);
    }

    public function store(StoreNamespaceRequest $request): RedirectResponse
    {
        $data = $request->validated();

        if ($request->hasFile('cover_image')) {
            $data['cover_image'] = $request->file('cover_image')->store('namespaces', 'public');
        }

        PostNamespace::create($data);

        return to_route('admin.posts.index');
    }

    public function edit(PostNamespace $namespace): InertiaResponse
    {
        return Inertia::render('admin/namespaces/edit', [
            'ancestors' => $this->ancestorOptions($namespace),
            'namespace' => $namespace,
        ]);
    }

    public function update(UpdateNamespaceRequest $request, PostNamespace $namespace): RedirectResponse
    {
        $data = $request->safe()->except('cover_image');

        if ($request->hasFile('cover_image')) {
            if ($namespace->cover_image) {
                Storage::disk('public')->delete($namespace->cover_image);
            }
            $data['cover_image'] = $request->file('cover_image')->store('namespaces', 'public');
        }

        $namespace->update($data);

        return to_route('admin.posts.namespace', $namespace);
    }

    public function destroy(PostNamespace $namespace): RedirectResponse
    {
        $namespace->deleteRecursively();

        return to_route('admin.posts.index');
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function ancestorOptions(PostNamespace $namespace): array
    {
        $segments = array_values(array_filter(
            explode('/', trim($namespace->full_path, '/')),
            fn (string $segment): bool => $segment !== '',
        ));

        array_pop($segments);

        if ($segments === []) {
            return [];
        }

        $paths = [];
        $currentPath = '';

        foreach ($segments as $segment) {
            $currentPath = $currentPath === '' ? $segment : "{$currentPath}/{$segment}";
            $paths[] = $currentPath;
        }

        $ancestorsByPath = PostNamespace::query()
            ->whereIn('full_path', $paths)
            ->get(['id', 'name', 'full_path'])
            ->keyBy('full_path');

        return collect($paths)
            ->map(function (string $path) use ($ancestorsByPath): ?array {
                /** @var ?PostNamespace $ancestor */
                $ancestor = $ancestorsByPath->get($path);

                if ($ancestor === null) {
                    return null;
                }

                return [
                    'id' => $ancestor->id,
                    'name' => $ancestor->name,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }
}
