<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

test('update is blocked when post is in sync mode', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'title' => 'Original Title',
        'is_syncing' => true,
        'sync_file_path' => '/some/path',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', ['namespace' => $namespace, 'post' => $post->slug]), [
            'title' => 'Attempted Edit',
            'slug' => 'guide',
            'content' => 'Attempted content.',
            'is_draft' => false,
        ])
        ->assertForbidden();

    $post->refresh();
    expect($post->title)->toBe('Original Title');
});

test('update succeeds when post is not in sync mode', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'title' => 'Original Title',
        'is_syncing' => false,
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', ['namespace' => $namespace, 'post' => $post->slug]), [
            'title' => 'New Title',
            'slug' => 'guide',
            'content' => 'New content.',
            'is_draft' => false,
        ])
        ->assertRedirect();

    $post->refresh();
    expect($post->title)->toBe('New Title');
});

test('destroySyncFile deletes the physical file and ends sync mode', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);

    $tmpFile = tempnam(sys_get_temp_dir(), 'sync_test_');
    file_put_contents($tmpFile, "---\ntitle: Guide\n---\n\nContent.");

    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'is_syncing' => true,
        'sync_file_path' => $tmpFile,
    ]);

    $this->actingAs($user)
        ->delete(route('admin.posts.destroySyncFile', ['namespace' => $namespace, 'post' => $post->slug]))
        ->assertRedirect(route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug]));

    expect(File::exists($tmpFile))->toBeFalse();

    $post->refresh();
    expect($post->is_syncing)->toBeFalse()
        ->and($post->sync_file_path)->toBeNull();
});

test('destroySyncFile returns 404 when post is not in sync mode', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'is_syncing' => false,
    ]);

    $this->actingAs($user)
        ->delete(route('admin.posts.destroySyncFile', ['namespace' => $namespace, 'post' => $post->slug]))
        ->assertNotFound();
});

test('destroySyncFile gracefully handles missing physical file', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'is_syncing' => true,
        'sync_file_path' => '/nonexistent/path/file.md',
    ]);

    $this->actingAs($user)
        ->delete(route('admin.posts.destroySyncFile', ['namespace' => $namespace, 'post' => $post->slug]))
        ->assertRedirect();

    $post->refresh();
    expect($post->is_syncing)->toBeFalse();
});

test('storeSyncFile writes frontmatter file and enables sync mode', function () {
    $user = User::factory()->create();
    $syncDir = sys_get_temp_dir().'/sync_store_test_'.uniqid();
    mkdir($syncDir, 0755, true);
    config(['thinkstream.sync.directory' => $syncDir]);

    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'title' => 'My Guide',
        'content' => 'Hello world.',
        'is_syncing' => false,
    ]);

    $this->actingAs($user)
        ->post(route('admin.posts.storeSyncFile', ['namespace' => $namespace, 'post' => $post->slug]))
        ->assertRedirect(route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug]));

    $post->refresh();
    expect($post->is_syncing)->toBeTrue()
        ->and($post->sync_file_path)->toBe($syncDir.'/docs/guide.md')
        ->and($post->last_synced_at)->not->toBeNull();

    $fileContent = file_get_contents($syncDir.'/docs/guide.md');
    expect($fileContent)->toContain('title: \'My Guide\'')
        ->and($fileContent)->toContain('Hello world.');

    File::deleteDirectory($syncDir);
});

test('storeSyncFile returns 409 when post is already syncing', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'is_syncing' => true,
        'sync_file_path' => '/some/path',
    ]);

    $this->actingAs($user)
        ->post(route('admin.posts.storeSyncFile', ['namespace' => $namespace, 'post' => $post->slug]))
        ->assertStatus(409);
});

test('edit page exposes is_syncing and sync_file_path props', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'is_syncing' => true,
        'sync_file_path' => '/some/sync/docs/guide',
    ]);

    $response = $this->actingAs($user)
        ->get(route('admin.posts.edit', ['namespace' => $namespace, 'post' => $post->slug]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->has('post', fn ($prop) => $prop
            ->where('is_syncing', true)
            ->where('sync_file_path', '/some/sync/docs/guide')
            ->etc()
        )
    );
});
