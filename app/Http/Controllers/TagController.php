<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\Tag;
use Inertia\Inertia;
use Inertia\Response;

class TagController extends Controller
{
    public function show(string $tag): Response
    {
        $tagModel = Tag::where('name', $tag)->firstOrFail();

        $posts = $tagModel->posts()
            ->with('namespace:id,slug,full_path,name,is_published')
            ->published()
            ->orderBy('published_at', 'desc')
            ->get(['id', 'slug', 'full_path', 'title', 'published_at', 'namespace_id']);

        $groups = $posts
            ->filter(fn (Post $post) => $post->namespace?->is_published)
            ->groupBy(fn (Post $post) => $post->namespace->full_path)
            ->map(fn ($groupPosts, string $namespacePath) => [
                'namespace' => [
                    'name' => $groupPosts->first()->namespace->name,
                    'full_path' => $namespacePath,
                ],
                'posts' => $groupPosts->map(fn (Post $post) => [
                    'title' => $post->title,
                    'full_path' => $post->full_path,
                    'published_at' => $post->published_at,
                ])->values()->all(),
            ])
            ->values()
            ->all();

        return Inertia::render('tags/show', [
            'tag' => $tagModel->name,
            'groups' => $groups,
        ]);
    }
}
