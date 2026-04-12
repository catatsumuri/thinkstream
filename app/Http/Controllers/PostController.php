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
                ->get(['id', 'slug', 'name', 'description', 'cover_image']),
        ]);
    }

    public function namespace(PostNamespace $namespace): RedirectResponse
    {
        if (! $namespace->is_published) {
            abort(404);
        }

        $posts = $namespace->posts()
            ->whereNotNull('published_at')
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['id', 'slug']);

        $firstPost = $namespace->sortPosts($posts)->first();

        if (! $firstPost) {
            abort(404);
        }

        return redirect()->route('posts.show', [$namespace->slug, $firstPost->slug]);
    }

    public function show(PostNamespace $namespace, Post $post): Response|RedirectResponse
    {
        if (! $namespace->is_published) {
            abort(404);
        }

        $posts = $namespace->posts()
            ->whereNotNull('published_at')
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['id', 'slug', 'title', 'published_at']);

        return Inertia::render('posts/show', [
            'namespace' => $namespace->only(['id', 'slug', 'name', 'cover_image_url']),
            'post' => $post,
            'posts' => $namespace->sortPosts($posts),
        ]);
    }
}
