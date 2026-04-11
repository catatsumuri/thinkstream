<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('posts/index', [
            'namespaces' => PostNamespace::published()
                ->withCount(['posts' => fn ($q) => $q->whereNotNull('published_at')])
                ->orderBy('name')
                ->get(['id', 'slug', 'name', 'description']),
        ]);
    }

    public function namespace(PostNamespace $namespace): Response|RedirectResponse
    {
        if (! $namespace->is_published) {
            abort(404);
        }

        return Inertia::render('posts/namespace', [
            'namespace' => $namespace,
            'posts' => $namespace->posts()
                ->whereNotNull('published_at')
                ->orderByDesc('published_at')
                ->get(),
        ]);
    }

    public function show(PostNamespace $namespace, Post $post): Response|RedirectResponse
    {
        if (! $namespace->is_published) {
            abort(404);
        }

        return Inertia::render('posts/show', [
            'namespace' => $namespace,
            'post' => $post,
        ]);
    }
}
