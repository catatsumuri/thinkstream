<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostReferrer;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->where('top_posts', [])
            ->where('top_referrers', [])
            ->where('tags', [])
        );
});

test('dashboard shows top 10 posts ordered by page views', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);

    $topPosts = collect(range(1, 12))->map(function (int $index) use ($namespace, $user) {
        return Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
            'title' => "Post {$index}",
            'slug' => "post-{$index}",
            'full_path' => "guides/post-{$index}",
            'page_views' => $index * 10,
        ]);
    });

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('top_posts', 10)
            ->where('top_posts.0.title', $topPosts->last()->title)
            ->where('top_posts.0.page_views', 120)
            ->where('top_posts.0.admin_url', route('admin.posts.show', [$namespace->id, $topPosts->last()->slug], false))
            ->where('top_posts.0.canonical_url', route('posts.path', ['path' => $topPosts->last()->full_path], false))
            ->where('top_posts.9.title', $topPosts->get(2)->title)
            ->where('top_posts.9.page_views', 30)
        );
});

test('dashboard shows all tags ordered by post count descending', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);

    $tagA = Tag::create(['name' => 'laravel']);
    $tagB = Tag::create(['name' => 'php']);
    $tagC = Tag::create(['name' => 'unused']);

    $posts = Post::factory()->count(3)->for($user)->for($namespace, 'namespace')->create();

    $tagA->posts()->attach($posts->pluck('id'));
    $tagB->posts()->attach($posts->first()->id);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('tags', 2)
            ->where('tags.0.name', 'laravel')
            ->where('tags.0.posts_count', 3)
            ->where('tags.1.name', 'php')
            ->where('tags.1.posts_count', 1)
        );
});

test('dashboard groups top referrers by host and keeps malformed referrers readable', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);

    $laravelPost = Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'title' => 'Laravel',
        'slug' => 'laravel',
        'full_path' => 'guides/laravel',
        'page_views' => 40,
    ]);
    $phpPost = Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'title' => 'PHP',
        'slug' => 'php',
        'full_path' => 'guides/php',
        'page_views' => 15,
    ]);
    $oddPost = Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'title' => 'Odd',
        'slug' => 'odd',
        'full_path' => 'guides/odd',
        'page_views' => 25,
    ]);
    PostReferrer::create([
        'post_id' => $laravelPost->id,
        'http_referer' => 'https://example.com/docs/laravel',
        'referrer_host' => 'example.com',
        'count' => 40,
    ]);
    PostReferrer::create([
        'post_id' => $phpPost->id,
        'http_referer' => 'https://example.com/docs/php',
        'referrer_host' => 'example.com',
        'count' => 15,
    ]);
    PostReferrer::create([
        'post_id' => $oddPost->id,
        'http_referer' => 'not a valid url',
        'referrer_host' => 'not a valid url',
        'count' => 25,
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard')
            ->has('top_referrers', 2)
            ->where('top_referrers.0.host', 'example.com')
            ->where('top_referrers.0.post_count', 2)
            ->where('top_referrers.0.total_views', 55)
            ->where('top_referrers.1.host', 'not a valid url')
            ->where('top_referrers.1.post_count', 1)
            ->where('top_referrers.1.total_views', 25)
        );
});
