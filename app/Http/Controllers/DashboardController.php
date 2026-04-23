<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $topPosts = Post::query()
            ->where('page_views', '>', 0)
            ->orderByDesc('page_views')
            ->orderByDesc('updated_at')
            ->limit(10)
            ->get([
                'id',
                'namespace_id',
                'title',
                'slug',
                'full_path',
                'page_views',
                'is_draft',
                'published_at',
            ])
            ->map(fn (Post $post): array => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'full_path' => $post->full_path,
                'page_views' => $post->page_views,
                'canonical_url' => ! $post->is_draft && $post->published_at !== null && $post->published_at->isPast()
                    ? route('posts.path', ['path' => $post->full_path], absolute: false)
                    : null,
                'admin_url' => route('admin.posts.show', [
                    'namespace' => $post->namespace_id,
                    'post' => $post->slug,
                ], absolute: false),
            ])
            ->values()
            ->all();

        return Inertia::render('dashboard', [
            'top_posts' => $topPosts,
        ]);
    }
}
