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

        $returnTo = $this->safeReturnPath($request->string('return_to')->toString());

        if ($returnTo !== null) {
            return redirect()->to(route('posts.path', ['path' => $namespace->full_path], absolute: false));
        }

        return to_route('admin.posts.index');
    }

    public function destroy(PostNamespace $namespace): RedirectResponse
    {
        $namespace->deleteRecursively();

        return to_route('admin.posts.index');
    }

    private function safeReturnPath(string $path): ?string
    {
        if ($path === '') {
            return null;
        }

        if (
            ! str_starts_with($path, '/')
            || str_starts_with($path, '//')
            || parse_url($path, PHP_URL_SCHEME) !== null
            || parse_url($path, PHP_URL_HOST) !== null
        ) {
            return null;
        }

        return $path;
    }
}
