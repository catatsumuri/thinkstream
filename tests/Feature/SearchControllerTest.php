<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests can open the search page', function () {
    PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
        'parent_id' => null,
    ]);

    $this->get(route('search'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('search/index')
            ->where('query', '')
            ->where('namespace', '')
        );
});

test('authenticated users can open the search page with guide results', function () {
    $user = User::factory()->create();
    $guides = PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
        'parent_id' => null,
    ]);

    $post = Post::factory()->for($guides, 'namespace')->published()->create([
        'title' => 'Markdown Syntax Guide',
        'slug' => 'index',
        'full_path' => 'guides/index',
        'content' => 'Markdown basics and examples for guide pages.',
    ]);

    $this->actingAs($user)
        ->get(route('search'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('search/index')
            ->where('query', '')
            ->where('namespace', '')
            ->has('results', 1)
            ->where('results.0.id', $post->id)
            ->where('results.0.page', 'Markdown Syntax Guide')
            ->where('results.0.path', '/guides/index')
            ->where('search.namespaces.0.value', 'guides')
        );
});

test('search page filters guide results by query', function () {
    $user = User::factory()->create();
    $guides = PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
        'parent_id' => null,
    ]);

    Post::factory()->for($guides, 'namespace')->published()->create([
        'title' => 'Markdown Syntax Guide',
        'slug' => 'index',
        'full_path' => 'guides/index',
        'content' => 'Markdown basics and examples for guide pages.',
    ]);

    Post::factory()->for($guides, 'namespace')->published()->create([
        'title' => 'Mintlify Syntax',
        'slug' => 'mintlify-syntax',
        'full_path' => 'guides/mintlify-syntax',
        'content' => 'Mintlify specific syntax reference.',
    ]);

    $this->actingAs($user)
        ->get(route('search', ['q' => 'mintlify']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('search/index')
            ->where('query', 'mintlify')
            ->has('results', 1)
            ->where('results.0.page', 'Mintlify Syntax')
        );
});

test('search page can be narrowed to guides namespace', function () {
    $user = User::factory()->create();
    $guides = PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
        'parent_id' => null,
    ]);
    $other = PostNamespace::factory()->create([
        'name' => 'Operations',
        'slug' => 'operations',
        'full_path' => 'operations',
        'is_published' => true,
        'parent_id' => null,
    ]);

    Post::factory()->for($guides, 'namespace')->published()->create([
        'title' => 'Markdown Syntax Guide',
        'slug' => 'index',
        'full_path' => 'guides/index',
        'content' => 'Markdown basics and examples for guide pages.',
    ]);

    Post::factory()->for($other, 'namespace')->published()->create([
        'title' => 'Operations Guide',
        'slug' => 'operations-guide',
        'full_path' => 'operations/guide',
        'content' => 'Operations content.',
    ]);

    $this->actingAs($user)
        ->get(route('search', ['namespace' => 'guides']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('search/index')
            ->where('namespace', 'guides')
            ->has('results', 1)
            ->where('results.0.path', '/guides/index')
        );
});

test('non guides namespace returns no dummy results', function () {
    $user = User::factory()->create();
    PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
        'parent_id' => null,
    ]);
    PostNamespace::factory()->create([
        'name' => 'Operations',
        'slug' => 'operations',
        'full_path' => 'operations',
        'is_published' => true,
        'parent_id' => null,
    ]);

    $this->actingAs($user)
        ->get(route('search', ['namespace' => 'operations']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('search/index')
            ->where('namespace', 'operations')
            ->has('results', 0)
        );
});
