<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('homepage lists published namespaces only', function () {
    PostNamespace::factory()->create([
        'slug' => 'published',
        'description' => 'Published namespace description.',
        'is_published' => true,
    ]);
    PostNamespace::factory()->create(['slug' => 'draft', 'is_published' => false]);

    $response = $this->get(route('home'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('posts/index')
        ->has('namespaces', 1)
        ->where('namespaces.0.slug', 'published')
        ->where('namespaces.0.description', 'Published namespace description.')
    );
});

test('unpublished namespace returns 404 on namespace page', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => false]);

    $this->get(route('posts.namespace', $namespace))->assertNotFound();
});

test('published namespace shows its posts', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);

    $this->get(route('posts.namespace', $namespace))->assertOk();
});

test('unpublished namespace returns 404 on post show page', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => false]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create();

    $this->get(route('posts.show', [$namespace, $post]))->assertNotFound();
});

test('published namespace shows post', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $post = Post::factory()->for($namespace, 'namespace')->published()->create();

    $this->get(route('posts.show', [$namespace, $post]))->assertOk();
});
