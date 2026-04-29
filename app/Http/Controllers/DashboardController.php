<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostReferrer;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $recentPosts = Post::query()
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
                'updated_at',
            ])
            ->map(fn (Post $post): array => [
                'id' => $post->id,
                'title' => $post->title,
                'full_path' => $post->full_path,
                'page_views' => $post->page_views,
                'updated_at' => $post->updated_at->toISOString(),
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

        $topReferrers = PostReferrer::query()
            ->select('referrer_host')
            ->selectRaw('COUNT(DISTINCT post_id) as post_count')
            ->selectRaw('SUM(count) as total_views')
            ->groupBy('referrer_host')
            ->orderByDesc('total_views')
            ->limit(10)
            ->get()
            ->map(fn (PostReferrer $referrer): array => [
                'host' => $referrer->referrer_host,
                'post_count' => (int) $referrer->post_count,
                'total_views' => (int) $referrer->total_views,
            ])
            ->values()
            ->all();

        return Inertia::render('dashboard', [
            'recent_posts' => $recentPosts,
            'top_posts' => $topPosts,
            'top_referrers' => $topReferrers,
        ]);
    }
}
