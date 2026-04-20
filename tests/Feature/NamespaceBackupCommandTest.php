<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\Yaml\Yaml;

uses(RefreshDatabase::class);

test('namespace backup command exports namespace metadata and markdown posts', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'full_path' => 'guides',
        'description' => 'Step-by-step guides.',
        'post_order' => ['routing'],
    ]);

    $namespace->forceFill(['sort_order' => 3])->save();

    Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'title' => 'Routing',
        'slug' => 'routing',
        'full_path' => 'guides/routing',
        'content' => "# Routing\n\nBackup me.",
    ]);

    $zipPath = storage_path('framework/testing/'.Str::uuid().'.zip');

    $this->artisan('namespace:backup', [
        'namespace' => $namespace->slug,
        '--output' => $zipPath,
    ])->assertSuccessful();

    expect($zipPath)->toBeFile();

    $zip = new ZipArchive;
    expect($zip->open($zipPath))->toBeTrue();

    $namespaceData = Yaml::parse($zip->getFromName('_namespace.yaml'));
    $postMarkdown = $zip->getFromName('routing.md');
    $zip->close();

    expect($namespaceData)->toMatchArray([
        'slug' => 'guides',
        'name' => 'Guides',
        'full_path' => 'guides',
        'description' => 'Step-by-step guides.',
        'post_order' => ['routing'],
        'sort_order' => 3,
    ]);

    expect($postMarkdown)->toContain('title: Routing')
        ->toContain('slug: routing')
        ->toContain('full_path: guides/routing')
        ->toContain("# Routing\n\nBackup me.");

    File::delete($zipPath);
});

test('namespace restore command imports a namespace backup zip', function () {
    $user = User::factory()->create();

    $this->artisan('namespace:restore', [
        'path' => database_path('backups/laravel-13.zip'),
    ])->assertSuccessful();

    $namespace = PostNamespace::query()->where('slug', 'laravel-13')->first();

    expect($namespace)->not->toBeNull()
        ->and($namespace->name)->toBe('Laravel 13')
        ->and($namespace->full_path)->toBe('laravel-13');

    $posts = Post::query()
        ->where('namespace_id', $namespace->id)
        ->orderBy('slug')
        ->get();

    expect($posts)->toHaveCount(2)
        ->and($posts->pluck('slug')->all())->toBe([
            'laravel-ai-sdk',
            'upgrade-12-to-13',
        ])
        ->and($posts->pluck('user_id')->unique()->all())->toBe([$user->id]);
});

test('namespace restore command fails when no user exists', function () {
    $this->artisan('namespace:restore', [
        'path' => database_path('backups/laravel-13.zip'),
    ])->expectsOutput('Cannot restore posts without an existing user.')
        ->assertFailed();

    expect(PostNamespace::query()->where('slug', 'laravel-13')->exists())->toBeFalse()
        ->and(Post::query()->count())->toBe(0);
});
