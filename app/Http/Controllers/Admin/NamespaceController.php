<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreNamespaceRequest;
use App\Http\Requests\Admin\UpdateNamespaceRequest;
use App\Models\PostNamespace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class NamespaceController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('admin/namespaces/create');
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

    public function edit(PostNamespace $namespace): Response
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

        return to_route('admin.posts.index');
    }

    public function destroy(PostNamespace $namespace): RedirectResponse
    {
        if ($namespace->cover_image) {
            Storage::disk('public')->delete($namespace->cover_image);
        }

        $namespace->delete();

        return to_route('admin.posts.index');
    }
}
