<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreNamespaceRequest;
use App\Http\Requests\Admin\UpdateNamespaceRequest;
use App\Models\PostNamespace;
use Illuminate\Http\RedirectResponse;
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
        PostNamespace::create($request->validated());

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
        $namespace->update($request->validated());

        return to_route('admin.posts.index');
    }

    public function destroy(PostNamespace $namespace): RedirectResponse
    {
        $namespace->delete();

        return to_route('admin.posts.index');
    }
}
