<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostReferrer;
use App\Models\Tag;
use App\Models\User;
use App\Support\ReservedContentPath;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('homepage lists published namespaces only', function () {
    $rootNamespace = PostNamespace::factory()->create([
        'slug' => 'published',
        'description' => 'Published namespace description.',
        'is_published' => true,
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $rootNamespace->id,
        'slug' => 'nested',
        'is_published' => true,
    ]);
    PostNamespace::factory()->create(['slug' => 'draft', 'is_published' => false]);

    $response = $this->get(route('home'));

    $response->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/index')
            ->has('namespaces', 1)
            ->where('namespaces.0.slug', 'published')
            ->where('namespaces.0.full_path', 'published')
            ->where('namespaces.0.description', 'Published namespace description.')
        );
});

test('unpublished namespace returns 404 on namespace page', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => false]);

    $this->get(route('posts.path', ['path' => $namespace->full_path]))->assertNotFound();
});

test('unpublished ancestor returns 404 on namespace page', function () {
    $root = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => false,
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
        'is_published' => true,
    ]);

    $this->get(route('posts.path', ['path' => $child->full_path]))->assertNotFound();
});

test('published namespace shows child namespaces and direct posts', function () {
    $namespace = PostNamespace::factory()->create([
        'is_published' => true,
        'slug' => 'guides',
        'name' => 'Guides',
        'description' => 'Practical guides for the canonical namespace page.',
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'laravel',
        'name' => 'Laravel',
        'is_published' => true,
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'hidden',
        'is_published' => false,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create();

    $this->get(route('posts.path', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('namespace.full_path', $namespace->full_path)
            ->where('namespace.name', 'Guides')
            ->where('namespace.description', 'Practical guides for the canonical namespace page.')
            ->where('namespace.is_published', true)
            ->where('navRoot.full_path', $namespace->full_path)
            ->has('children', 1)
            ->where('navRoot.children.0.full_path', $child->full_path)
            ->where('children.0.full_path', $child->full_path)
            ->where('posts.0.full_path', $post->full_path)
            ->where('navRoot.posts.0.full_path', $post->full_path)
        );
});

test('guest namespace page receives no authenticated user', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);

    $this->get(route('posts.path', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('auth.user', null)
        );
});

test('authenticated namespace page receives the current user for canonical controls', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);

    $this->actingAs($user)
        ->get(route('posts.path', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('auth.user.id', $user->id)
            ->where('auth.user.name', $user->name)
            ->where('namespace.id', $namespace->id)
        );
});

test('published namespace sorts child namespaces by post order', function () {
    $namespace = PostNamespace::factory()->create([
        'is_published' => true,
        'slug' => 'guides',
        'post_order' => ['beta', 'alpha'],
    ]);
    $alpha = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'alpha',
        'is_published' => true,
    ]);
    $beta = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'beta',
        'is_published' => true,
    ]);

    $this->get(route('posts.path', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->where('children.0.full_path', $beta->full_path)
            ->where('children.1.full_path', $alpha->full_path)
        );
});

test('navigation sorts posts by published_at ascending when no custom order exists', function () {
    $namespace = PostNamespace::factory()->create([
        'is_published' => true,
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);
    $user = User::factory()->create();
    $laterPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'later-post',
        'full_path' => 'guides/later-post',
        'is_draft' => false,
        'published_at' => now(),
    ]);
    $earlierPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'earlier-post',
        'full_path' => 'guides/earlier-post',
        'is_draft' => false,
        'published_at' => now()->subDay(),
    ]);

    $this->get(route('posts.path', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->where('navRoot.posts.0.full_path', $earlierPost->full_path)
            ->where('navRoot.posts.1.full_path', $laterPost->full_path)
        );
});

test('unpublished ancestor returns 404 on post show page', function () {
    $root = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => false,
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($child, 'namespace')->published()->create([
        'slug' => 'routing',
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))->assertNotFound();
});

test('published namespace shows post with breadcrumbs', function () {
    $root = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
        'name' => 'Laravel',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($child, 'namespace')->published()->create([
        'slug' => 'routing',
        'reference_title' => 'Laravel Routing',
        'reference_url' => 'https://laravel.com/docs/routing',
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('navRoot.full_path', $root->full_path)
            ->where('navRoot.children.0.full_path', $child->full_path)
            ->where('navRoot.children.0.posts.0.full_path', $post->full_path)
            ->where('namespace.full_path', $child->full_path)
            ->where('post.full_path', $post->full_path)
            ->where('post.reference_title', 'Laravel Routing')
            ->where('post.reference_url', 'https://laravel.com/docs/routing')
            ->where('postUrl', route('posts.path', ['path' => $post->full_path]))
            ->where('breadcrumbs.0.full_path', $root->full_path)
            ->where('posts.0.full_path', $post->full_path)
        );
});

test('published post increments page views and queues a tracking cookie', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'page_views' => 4,
    ]);

    $response = $this
        ->withHeader('Referer', 'https://example.com/search?q=laravel')
        ->get(route('posts.path', ['path' => $post->full_path]));

    $response->assertSuccessful()
        ->assertCookie('post_viewed_'.$post->id, '1')
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.id', $post->id)
            ->where('post.page_views', 5)
        );

    expect($post->fresh()->page_views)->toBe(5)
        ->and(PostReferrer::where('post_id', $post->id)->where('http_referer', 'https://example.com/search?q=laravel')->value('count'))->toBe(1);
});

test('published post does not increment page views again while tracking cookie exists', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'page_views' => 9,
    ]);

    $this->withCookie('post_viewed_'.$post->id, '1')
        ->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.id', $post->id)
            ->where('post.page_views', 9)
        );

    expect($post->fresh()->page_views)->toBe(9);
});

test('published post does not create a referrer record when the request has no referer header', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'page_views' => 1,
    ]);
    PostReferrer::create([
        'post_id' => $post->id,
        'http_referer' => 'https://old.example.com/article',
        'referrer_host' => 'old.example.com',
        'count' => 1,
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))->assertSuccessful();

    expect($post->fresh()->page_views)->toBe(2)
        ->and(PostReferrer::where('post_id', $post->id)->count())->toBe(1);
});

test('published post increments an existing referrer row instead of creating a duplicate', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'page_views' => 1,
    ]);
    PostReferrer::create([
        'post_id' => $post->id,
        'http_referer' => 'https://example.com/search?q=laravel',
        'referrer_host' => 'example.com',
        'count' => 1,
    ]);

    $this->withHeader('Referer', 'https://example.com/search?q=laravel')
        ->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.id', $post->id)
            ->where('post.page_views', 2)
        );

    $referrer = PostReferrer::query()
        ->where('post_id', $post->id)
        ->where('http_referer', 'https://example.com/search?q=laravel')
        ->first();

    expect($post->fresh()->page_views)->toBe(2)
        ->and($referrer)->not->toBeNull()
        ->and($referrer->count)->toBe(2)
        ->and(PostReferrer::where('post_id', $post->id)->count())->toBe(1);
});

test('post referrers table enforces unique referrers per post', function () {
    $post = Post::factory()->published()->create();

    PostReferrer::create([
        'post_id' => $post->id,
        'http_referer' => 'https://example.com/search?q=laravel',
        'referrer_host' => 'example.com',
        'count' => 1,
    ]);

    expect(fn () => PostReferrer::create([
        'post_id' => $post->id,
        'http_referer' => 'https://example.com/search?q=laravel',
        'referrer_host' => 'example.com',
        'count' => 1,
    ]))->toThrow(QueryException::class);
});

test('published post does not increment page views for bot user agents', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'page_views' => 7,
    ]);

    $this->withHeader('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')
        ->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.id', $post->id)
            ->where('post.page_views', 7)
        );

    expect($post->fresh()->page_views)->toBe(7);
});

test('guest post page receives no authenticated user', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('auth.user', null)
        );
});

test('authenticated post page receives the current user for canonical controls', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
    ]);

    $this->actingAs($user)
        ->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('auth.user.id', $user->id)
            ->where('auth.user.name', $user->name)
            ->where('post.id', $post->id)
        );
});

test('markdown route returns 404 when markdown pages are disabled', function () {
    config(['thinkstream.markdown_pages.enabled' => false]);

    $post = Post::factory()->published()->create([
        'slug' => 'routing',
    ]);

    $this->get(route('posts.path.markdown', ['path' => $post->full_path]))
        ->assertNotFound();
});

test('markdown route returns post markdown when markdown pages are enabled', function () {
    config(['thinkstream.markdown_pages.enabled' => true]);

    $post = Post::factory()->published()->create([
        'slug' => 'routing',
        'title' => 'Routing',
        'content' => "## Intro\n\nRoute content.",
    ]);

    $this->get(route('posts.path.markdown', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertHeader('content-type', 'text/markdown; charset=UTF-8')
        ->assertSeeText('# Routing')
        ->assertSeeText('## Intro')
        ->assertSeeText('Route content.');
});

test('markdown route returns namespace markdown when markdown pages are enabled', function () {
    config(['thinkstream.markdown_pages.enabled' => true]);

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'description' => 'Practical guides.',
        'is_published' => true,
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'laravel',
        'name' => 'Laravel',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'title' => 'Routing',
    ]);

    $this->get(route('posts.path.markdown', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertHeader('content-type', 'text/markdown; charset=UTF-8')
        ->assertSeeText('# Guides')
        ->assertSeeText('Practical guides.')
        ->assertSeeText('[Laravel](/guides/laravel)', false)
        ->assertSeeText('[Routing](/guides/routing)', false);
});

test('authenticated users can access preview markdown for draft posts', function () {
    config(['thinkstream.markdown_pages.enabled' => true]);

    $user = User::factory()->create();
    $post = Post::factory()->create([
        'slug' => 'draft-post',
        'title' => 'Draft Post',
        'is_draft' => true,
        'published_at' => null,
        'content' => 'Preview only.',
    ]);

    $this->actingAs($user)
        ->get(route('posts.path.markdown', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertSeeText('Preview content')
        ->assertSeeText('# Draft Post')
        ->assertSeeText('Preview only.');
});

test('previewing a draft post does not increment page views', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->draft()->create([
        'slug' => 'routing',
        'page_views' => 3,
    ]);

    $this->actingAs($user)
        ->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.id', $post->id)
            ->where('post.page_views', 3)
            ->where('preview.status', 'draft')
        );

    expect($post->fresh()->page_views)->toBe(3);
});

test('homepage counts published posts from descendant namespaces', function () {
    $root = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
        'is_published' => true,
    ]);
    $grandchild = PostNamespace::factory()->create([
        'parent_id' => $child->id,
        'slug' => 'routing',
        'is_published' => true,
    ]);

    Post::factory()->for($root, 'namespace')->published()->create();
    Post::factory()->for($child, 'namespace')->published()->create();
    Post::factory()->for($grandchild, 'namespace')->published()->create();
    Post::factory()->for($grandchild, 'namespace')->scheduled()->create();

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->where('namespaces.0.full_path', $root->full_path)
            ->where('namespaces.0.posts_count', 3)
        );
});

test('post page prefers first markdown image for social card metadata', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'routing',
        'content' => "Intro\n\n![Cover](/images/cards/routing.png)\n\nMore text",
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->where('cardImage', url('/images/cards/routing.png'))
            ->where('postUrl', route('posts.path', ['path' => $post->full_path]))
        );
});

test('scheduled post is not counted on homepage', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true, 'parent_id' => null]);
    Post::factory()->for($namespace, 'namespace')->published()->create();
    Post::factory()->for($namespace, 'namespace')->scheduled()->create();

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->where('namespaces.0.posts_count', 1)
        );
});

test('post without publish date is not counted on homepage', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true, 'parent_id' => null]);

    Post::factory()->for($namespace, 'namespace')->create([
        'is_draft' => false,
        'published_at' => null,
    ]);

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->where('namespaces.0.posts_count', 0));
});

test('scheduled post is not shown in namespace listing', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    Post::factory()->for($namespace, 'namespace')->scheduled()->create();

    $this->get(route('posts.path', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->has('posts', 0));
});

test('post without publish date is not directly accessible', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->create([
        'is_draft' => false,
        'published_at' => null,
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))->assertNotFound();
});

test('scheduled post is not directly accessible', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->scheduled()->create();

    $this->get(route('posts.path', ['path' => $post->full_path]))->assertNotFound();
});

test('scheduled post does not appear in sidebar when viewing another post', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $published = Post::factory()->for($namespace, 'namespace')->published()->create();
    Post::factory()->for($namespace, 'namespace')->scheduled()->create();

    $this->get(route('posts.path', ['path' => $published->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->has('posts', 1));
});

test('admin routes are not caught by the content path wildcard', function () {
    $this->get('/admin/namespaces/create')->assertRedirect(route('login'));
});

test('login and register routes are not caught by the content path wildcard', function (string $path) {
    $this->get("/{$path}")->assertSuccessful();
})->with([
    'login' => 'login',
    'register' => 'register',
]);

test('api routes are not caught by the content path wildcard', function () {
    $this->getJson(route('api.ogp'))->assertUnprocessable();
});

test('reserved prefixes with nested segments are not caught by the content path wildcard', function (string $path) {
    $this->get("/{$path}")->assertNotFound();
})->with(fn (): array => collect(ReservedContentPath::ROOT_SEGMENTS)
    ->mapWithKeys(fn (string $segment): array => [$segment => "{$segment}/foo"])
    ->all());

test('lookalike slugs still resolve through the content path wildcard', function (string $slug) {
    $namespace = PostNamespace::factory()->create([
        'slug' => $slug,
        'name' => ucfirst($slug),
        'is_published' => true,
    ]);

    $this->get("/{$slug}")
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('namespace.full_path', $namespace->full_path)
        );
})->with([
    'apiary' => 'apiary',
    'administrator' => 'administrator',
]);

test('public post show includes tags', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'tagged-post',
        'full_path' => 'guides/tagged-post',
    ]);
    $tag = Tag::firstOrCreate(['name' => 'php']);
    $post->tags()->attach($tag);

    $this->get(route('posts.path', ['path' => 'guides/tagged-post']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.tags.0.name', 'php')
        );
});

test('public post show has empty tags when none are set', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'no-tags',
        'full_path' => 'guides/no-tags',
    ]);

    $this->get(route('posts.path', ['path' => 'guides/no-tags']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.tags', [])
        );
});

test('namespace page inherits parent cover image when child has none', function () {
    $parent = PostNamespace::factory()->create([
        'slug' => 'parent',
        'full_path' => 'parent',
        'cover_image' => 'namespaces/parent.webp',
        'is_published' => true,
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $parent->id,
        'slug' => 'child',
        'full_path' => 'parent/child',
        'cover_image' => null,
        'is_published' => true,
    ]);

    $this->get(route('posts.path', ['path' => 'parent/child']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('namespace.cover_image_url', fn ($url) => str_contains($url, 'parent.webp'))
        );
});

test('namespace page uses own cover image over parent', function () {
    $parent = PostNamespace::factory()->create([
        'slug' => 'parent',
        'full_path' => 'parent',
        'cover_image' => 'namespaces/parent.webp',
        'is_published' => true,
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $parent->id,
        'slug' => 'child',
        'full_path' => 'parent/child',
        'cover_image' => 'namespaces/child.webp',
        'is_published' => true,
    ]);

    $this->get(route('posts.path', ['path' => 'parent/child']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('namespace.cover_image_url', fn ($url) => str_contains($url, 'child.webp'))
        );
});

test('child namespaces in namespace page inherit parent cover image', function () {
    $parent = PostNamespace::factory()->create([
        'slug' => 'parent',
        'full_path' => 'parent',
        'cover_image' => 'namespaces/parent.webp',
        'is_published' => true,
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $parent->id,
        'slug' => 'child',
        'full_path' => 'parent/child',
        'cover_image' => null,
        'is_published' => true,
    ]);

    $this->get(route('posts.path', ['path' => 'parent']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('children.0.cover_image_url', fn ($url) => str_contains($url, 'parent.webp'))
        );
});

test('post page namespace inherits grandparent cover image', function () {
    $grandparent = PostNamespace::factory()->create([
        'slug' => 'grandparent',
        'full_path' => 'grandparent',
        'cover_image' => 'namespaces/grandparent.webp',
        'is_published' => true,
    ]);
    $parent = PostNamespace::factory()->create([
        'parent_id' => $grandparent->id,
        'slug' => 'parent',
        'full_path' => 'grandparent/parent',
        'cover_image' => null,
        'is_published' => true,
    ]);
    $post = Post::factory()->for($parent, 'namespace')->published()->create([
        'slug' => 'my-post',
        'full_path' => 'grandparent/parent/my-post',
    ]);

    $this->get(route('posts.path', ['path' => 'grandparent/parent/my-post']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('namespace.cover_image_url', fn ($url) => str_contains($url, 'grandparent.webp'))
        );
});

test('post page social card image inherits grandparent cover image', function () {
    $grandparent = PostNamespace::factory()->create([
        'slug' => 'grandparent',
        'full_path' => 'grandparent',
        'cover_image' => 'namespaces/grandparent.webp',
        'is_published' => true,
    ]);
    $parent = PostNamespace::factory()->create([
        'parent_id' => $grandparent->id,
        'slug' => 'parent',
        'full_path' => 'grandparent/parent',
        'cover_image' => null,
        'is_published' => true,
    ]);
    $post = Post::factory()->for($parent, 'namespace')->published()->create([
        'slug' => 'my-post',
        'full_path' => 'grandparent/parent/my-post',
        'content' => 'No inline image here.',
    ]);

    $this->get(route('posts.path', ['path' => 'grandparent/parent/my-post']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('cardImage', fn ($url) => str_contains($url, 'grandparent.webp'))
        );
});

test('post page social card image strips zenn size specifiers from the first markdown image', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'zenn-card-image',
        'full_path' => 'guides/zenn-card-image',
        'content' => <<<'MARKDOWN'
![Guide cover](/storage/namespaces/guide.png =250x)

Body copy.
MARKDOWN,
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('cardImage', url('/storage/namespaces/guide.png'))
        );
});

test('namespace with blog display_mode renders in blog mode with enriched post data', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'articles',
        'is_published' => true,
        'display_mode' => 'blog',
    ]);
    $tag = Tag::firstOrCreate(['name' => 'laravel']);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => 'Hello world, this is a test post.',
    ]);
    $post->tags()->attach($tag);

    $this->get(route('posts.path', ['path' => 'articles']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('blog_mode', true)
            ->has('posts.0.excerpt')
            ->has('posts.0.tags')
            ->has('posts.0.card_image')
        );
});

test('namespace without blog display_mode does not render in blog mode', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'is_published' => true,
        'display_mode' => null,
    ]);
    Post::factory()->for($namespace, 'namespace')->published()->create();

    $this->get(route('posts.path', ['path' => 'guides']))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/namespace')
            ->where('blog_mode', false)
        );
});
