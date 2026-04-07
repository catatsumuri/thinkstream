<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/posts/index', [
            'posts' => Post::latest()->get(['id', 'title', 'slug', 'published_at', 'created_at']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/posts/create');
    }

    public function store(StorePostRequest $request): RedirectResponse
    {
        Post::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return to_route('admin.posts.index');
    }

    public function show(Post $post): Response
    {
        return Inertia::render('admin/posts/show', [
            'post' => $post,
        ]);
    }

    public function edit(Post $post): Response
    {
        return Inertia::render('admin/posts/edit', [
            'post' => $post,
        ]);
    }

    public function update(UpdatePostRequest $request, Post $post): RedirectResponse
    {
        $post->update($request->validated());

        return to_route('admin.posts.index');
    }

    public function destroy(Post $post): RedirectResponse
    {
        $post->delete();

        return to_route('admin.posts.index');
    }
}
