<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('tag browse page shows published posts grouped by namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'php-basics',
        'full_path' => 'guides/php-basics',
        'title' => 'PHP Basics',
        'is_draft' => false,
        'published_at' => now()->subMinute(),
    ]);
    $tag = Tag::firstOrCreate(['name' => 'php']);
    $post->tags()->attach($tag);

    $this->get(route('tags.show', 'php'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('tags/show')
            ->where('tag', 'php')
            ->has('groups', 1)
            ->where('groups.0.namespace.full_path', 'guides')
            ->where('groups.0.posts.0.full_path', 'guides/php-basics')
        );
});

test('tag browse page returns 404 for unknown tag', function () {
    $this->get(route('tags.show', 'nonexistent-tag'))->assertNotFound();
});

test('tag browse page excludes draft posts', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $draft = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'is_draft' => true,
        'published_at' => null,
    ]);
    $tag = Tag::firstOrCreate(['name' => 'php']);
    $draft->tags()->attach($tag);

    $this->get(route('tags.show', 'php'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('groups', [])
        );
});

test('tag browse page excludes future-scheduled posts', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    $scheduled = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'is_draft' => false,
        'published_at' => now()->addDay(),
    ]);
    $tag = Tag::firstOrCreate(['name' => 'php']);
    $scheduled->tags()->attach($tag);

    $this->get(route('tags.show', 'php'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('groups', [])
        );
});

test('tag browse page excludes posts in unpublished namespaces', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['is_published' => false]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'is_draft' => false,
        'published_at' => now()->subMinute(),
    ]);
    $tag = Tag::firstOrCreate(['name' => 'php']);
    $post->tags()->attach($tag);

    $this->get(route('tags.show', 'php'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('groups', [])
        );
});

test('tag browse page returns empty groups when tag exists but has no published posts', function () {
    Tag::firstOrCreate(['name' => 'empty-tag']);

    $this->get(route('tags.show', 'empty-tag'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tag', 'empty-tag')
            ->where('groups', [])
        );
});
