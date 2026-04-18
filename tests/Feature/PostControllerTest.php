<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Support\ReservedContentPath;
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
            ->where('navRoot.full_path', $namespace->full_path)
            ->has('children', 1)
            ->where('navRoot.children.0.full_path', $child->full_path)
            ->where('children.0.full_path', $child->full_path)
            ->where('posts.0.full_path', $post->full_path)
            ->where('navRoot.posts.0.full_path', $post->full_path)
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
            ->where('breadcrumbs.0.full_path', $root->full_path)
            ->where('posts.0.full_path', $post->full_path)
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

test('post without publish date is counted on homepage', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true, 'parent_id' => null]);

    Post::factory()->for($namespace, 'namespace')->create([
        'is_draft' => false,
        'published_at' => null,
    ]);

    $this->get(route('home'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->where('namespaces.0.posts_count', 1));
});

test('scheduled post is not shown in namespace listing', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    Post::factory()->for($namespace, 'namespace')->scheduled()->create();

    $this->get(route('posts.path', ['path' => $namespace->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->has('posts', 0));
});

test('post without publish date remains directly accessible', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->create([
        'is_draft' => false,
        'published_at' => null,
    ]);

    $this->get(route('posts.path', ['path' => $post->full_path]))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('posts/show')
            ->where('post.full_path', $post->full_path)
        );
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
