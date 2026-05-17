<?php

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

beforeEach(function () {
    $this->actingAs(User::factory()->create());
});

it('requires authentication', function () {
    auth()->logout();

    $this->getJson('/api/posts/suggest')
        ->assertUnauthorized();
});

it('returns published posts when no query given', function () {
    Post::factory()->count(3)->published()->create();

    $this->getJson('/api/posts/suggest')
        ->assertOk()
        ->assertJsonCount(3)
        ->assertJsonStructure([['title', 'full_path']]);
});

it('filters posts by title', function () {
    Post::factory()->published()->create(['title' => 'Laravel Scout Guide']);
    Post::factory()->published()->create(['title' => 'Unrelated Post']);

    $this->getJson('/api/posts/suggest?q=Scout')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Laravel Scout Guide');
});

it('filters posts by full_path', function () {
    Post::factory()->published()->create(['title' => 'Some Post', 'slug' => 'some-post']);
    Post::factory()->published()->create(['title' => 'Other Post', 'slug' => 'other-post']);

    $fullPath = Post::where('slug', 'some-post')->value('full_path');

    $this->getJson("/api/posts/suggest?q={$fullPath}")
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.full_path', $fullPath);
});

it('returns empty array when no match', function () {
    Post::factory()->published()->create(['title' => 'Something']);

    $this->getJson('/api/posts/suggest?q=xyzzy-nomatch')
        ->assertOk()
        ->assertJsonCount(0);
});

it('excludes draft posts', function () {
    Post::factory()->draft()->create(['title' => 'Draft Post']);
    Post::factory()->published()->create(['title' => 'Published Post']);

    $this->getJson('/api/posts/suggest?q=Post')
        ->assertOk()
        ->assertJsonCount(1)
        ->assertJsonPath('0.title', 'Published Post');
});

it('limits results to 8', function () {
    Post::factory()->count(12)->published()->create();

    $this->getJson('/api/posts/suggest')
        ->assertOk()
        ->assertJsonCount(8);
});
