<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('it builds a full path for root namespaces', function () {
    $namespace = PostNamespace::factory()->create(['slug' => 'guides']);

    expect($namespace->fresh()->full_path)->toBe('guides');
});

test('it builds a full path for child namespaces', function () {
    $parent = PostNamespace::factory()->create(['slug' => 'guides']);
    $child = PostNamespace::factory()->create([
        'parent_id' => $parent->id,
        'slug' => 'laravel',
    ]);

    expect($child->fresh()->full_path)->toBe('guides/laravel');
});

test('it builds a full path for posts', function () {
    $namespace = PostNamespace::factory()->create(['slug' => 'guides']);
    $post = Post::factory()->for($namespace, 'namespace')->create(['slug' => 'routing']);

    expect($post->fresh()->full_path)->toBe('guides/routing');
});

test('updating a namespace slug syncs descendant namespace and post paths', function () {
    $root = PostNamespace::factory()->create(['slug' => 'guides']);
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
    ]);
    $post = Post::factory()->for($child, 'namespace')->create(['slug' => 'routing']);

    $root->update(['slug' => 'docs']);

    expect($child->fresh()->full_path)->toBe('docs/laravel');
    expect($post->fresh()->full_path)->toBe('docs/laravel/routing');
});

test('moving a namespace syncs its subtree paths', function () {
    $root = PostNamespace::factory()->create(['slug' => 'guides']);
    $targetParent = PostNamespace::factory()->create(['slug' => 'reference']);
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
    ]);
    $post = Post::factory()->for($child, 'namespace')->create(['slug' => 'routing']);

    $child->update(['parent_id' => $targetParent->id]);

    expect($child->fresh()->full_path)->toBe('reference/laravel');
    expect($post->fresh()->full_path)->toBe('reference/laravel/routing');
});
