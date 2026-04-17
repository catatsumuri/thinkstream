<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('inertia docs import command creates the namespace and imported posts', function () {
    $this->artisan('posts:import-inertia-docs')
        ->assertSuccessful()
        ->expectsOutputToContain('Imported Inertia.js documentation successfully.');

    $namespace = PostNamespace::query()
        ->whereNull('parent_id')
        ->where('slug', 'inertiajs-v3')
        ->first();

    expect($namespace)->not->toBeNull();
    expect($namespace->name)->toBe('InertiaJS V3');
    expect($namespace->full_path)->toBe('inertiajs-v3');
    expect($namespace->post_order)->toBe([
        'getting-started',
        'installation',
        'core-concepts',
    ]);

    $gettingStartedNamespace = PostNamespace::query()
        ->where('parent_id', $namespace->id)
        ->where('slug', 'getting-started')
        ->first();

    expect($gettingStartedNamespace)->not->toBeNull();
    expect($gettingStartedNamespace->full_path)->toBe('inertiajs-v3/getting-started');
    expect($gettingStartedNamespace->post_order)->toBe(['index']);

    $posts = Post::query()->orderBy('full_path')->get();

    expect($posts)->toHaveCount(3);

    $introduction = $posts->firstWhere('full_path', 'inertiajs-v3/getting-started/index');

    expect($introduction)->not->toBeNull();
    expect($introduction->title)->toBe('Introduction');
    expect($introduction->content)->not->toStartWith('---');
    expect($introduction->content)->toContain('](/inertiajs-v3/core-concepts/how-it-works)');
    expect($introduction->content)->toContain('](/inertiajs-v3/installation/server-side-setup)');
});

test('inertia docs import command updates an existing imported post instead of duplicating it', function () {
    $this->artisan('posts:import-inertia-docs')->assertSuccessful();

    $namespace = PostNamespace::query()
        ->whereNull('parent_id')
        ->where('slug', 'inertiajs-v3')
        ->firstOrFail();

    $gettingStartedNamespace = PostNamespace::query()
        ->where('parent_id', $namespace->id)
        ->where('slug', 'getting-started')
        ->firstOrFail();

    $post = Post::query()
        ->where('namespace_id', $gettingStartedNamespace->id)
        ->where('slug', 'index')
        ->firstOrFail();

    $post->update([
        'title' => 'Temporary Title',
        'content' => 'Temporary content',
    ]);

    $this->artisan('posts:import-inertia-docs')->assertSuccessful();

    $updatedPost = $post->fresh();

    expect($updatedPost->title)->toBe('Introduction');
    expect($updatedPost->content)->toContain('Inertia is a new approach');
    expect(
        Post::query()
            ->where('namespace_id', $gettingStartedNamespace->id)
            ->where('slug', 'index')
            ->count()
    )->toBe(1);
});

test('inertia docs import command does not reuse a child namespace with the same slug as the root namespace', function () {
    $parentNamespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    $conflictingChild = PostNamespace::factory()->create([
        'parent_id' => $parentNamespace->id,
        'slug' => 'inertiajs-v3',
        'name' => 'Nested Conflict',
        'description' => 'This should not be repurposed as the importer root.',
    ]);

    $this->artisan('posts:import-inertia-docs')->assertSuccessful();

    $rootNamespace = PostNamespace::query()
        ->whereNull('parent_id')
        ->where('slug', 'inertiajs-v3')
        ->first();

    expect($rootNamespace)->not->toBeNull();
    expect($rootNamespace->id)->not->toBe($conflictingChild->id);
    expect($rootNamespace->full_path)->toBe('inertiajs-v3');

    expect($conflictingChild->fresh()->parent_id)->toBe($parentNamespace->id);
    expect($conflictingChild->fresh()->name)->toBe('Nested Conflict');
    expect($conflictingChild->fresh()->description)->toBe('This should not be repurposed as the importer root.');
});
