<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/posts/index', [
            'namespaces' => PostNamespace::withCount('posts')->orderBy('name')->get(),
        ]);
    }

    public function namespaceIndex(PostNamespace $namespace): Response
    {
        return Inertia::render('admin/posts/namespace', [
            'namespace' => $namespace,
            'posts' => $namespace->posts()->latest()->get(['id', 'title', 'slug', 'published_at', 'created_at']),
        ]);
    }

    public function create(PostNamespace $namespace): Response
    {
        return Inertia::render('admin/posts/create', [
            'namespace' => $namespace,
        ]);
    }

    public function store(StorePostRequest $request, PostNamespace $namespace): RedirectResponse
    {
        Post::create([
            ...$request->validated(),
            'namespace_id' => $namespace->id,
            'user_id' => $request->user()->id,
        ]);

        return to_route('admin.posts.namespace', $namespace);
    }

    public function edit(PostNamespace $namespace, Post $post): Response
    {
        return Inertia::render('admin/posts/edit', [
            'namespace' => $namespace,
            'post' => $post,
        ]);
    }

    public function update(UpdatePostRequest $request, PostNamespace $namespace, Post $post): RedirectResponse
    {
        $post->update($request->validated());

        return to_route('admin.posts.namespace', $namespace);
    }

    public function destroy(PostNamespace $namespace, Post $post): RedirectResponse
    {
        $post->delete();

        return to_route('admin.posts.namespace', $namespace);
    }
}
