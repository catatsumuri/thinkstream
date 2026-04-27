<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

function makeSyncDir(): string
{
    $dir = sys_get_temp_dir().'/sync_watch_test_'.uniqid();
    mkdir($dir, 0755, true);

    return $dir;
}

function writeSyncFile(string $dir, string $relativePath, string $content): string
{
    $fullPath = $dir.'/'.$relativePath;
    $subDir = dirname($fullPath);

    if (! is_dir($subDir)) {
        mkdir($subDir, 0755, true);
    }

    file_put_contents($fullPath, $content);

    return $fullPath;
}

beforeEach(function () {
    $this->syncDir = makeSyncDir();
    config(['thinkstream.sync.directory' => $this->syncDir, 'thinkstream.sync.poll_interval' => 1]);
});

afterEach(function () {
    File::deleteDirectory($this->syncDir);
});

test('enables sync mode when file exists for a matching post', function () {
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create(['namespace_id' => $namespace->id, 'slug' => 'guide', 'full_path' => 'docs/guide']);

    writeSyncFile($this->syncDir, 'docs/guide.md', "---\ntitle: Guide Title\n---\n\nGuide content.");

    $this->artisan('sync:watch', ['--once' => true])->assertSuccessful();

    $post->refresh();

    expect($post->is_syncing)->toBeTrue()
        ->and($post->title)->toBe('Guide Title')
        ->and($post->content)->toBe('Guide content.')
        ->and($post->sync_file_path)->toBe($this->syncDir.'/docs/guide.md')
        ->and($post->last_synced_at)->not->toBeNull();
});

test('updates post content when file changes', function () {
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create(['namespace_id' => $namespace->id, 'slug' => 'guide', 'full_path' => 'docs/guide']);

    $filePath = writeSyncFile($this->syncDir, 'docs/guide.md', "---\ntitle: Guide\n---\n\nOriginal content.");

    $this->artisan('sync:watch', ['--once' => true])->assertSuccessful();

    touch($filePath, time() + 5);
    file_put_contents($filePath, "---\ntitle: Guide\n---\n\nUpdated content.");

    $post->refresh();
    $post->update(['last_synced_at' => now()->subSeconds(10)]);

    $this->artisan('sync:watch', ['--once' => true])->assertSuccessful();

    $post->refresh();
    expect($post->content)->toBe('Updated content.');
});

test('creates a revision when synced content changes', function () {
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'is_syncing' => true,
        'sync_file_path' => $this->syncDir.'/docs/guide.md',
        'last_synced_at' => now()->subSeconds(10),
        'title' => 'Old Title',
        'content' => 'Old content.',
    ]);

    writeSyncFile($this->syncDir, 'docs/guide.md', "---\ntitle: New Title\n---\n\nNew content.");

    $this->artisan('sync:watch', ['--once' => true])->assertSuccessful();

    expect($post->revisions()->count())->toBe(1);
    $revision = $post->revisions()->first();
    expect($revision->title)->toBe('Old Title')
        ->and($revision->content)->toBe('Old content.');
});

test('disables sync mode when file is deleted', function () {
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $filePath = writeSyncFile($this->syncDir, 'docs/guide.md', "---\ntitle: Guide\n---\n\nContent.");
    $post = Post::factory()->create([
        'namespace_id' => $namespace->id,
        'slug' => 'guide',
        'full_path' => 'docs/guide',
        'is_syncing' => true,
        'sync_file_path' => $filePath,
    ]);

    unlink($filePath);

    $this->artisan('sync:watch', ['--once' => true])->assertSuccessful();

    $post->refresh();
    expect($post->is_syncing)->toBeFalse()
        ->and($post->sync_file_path)->toBeNull();
});

test('syncs tags from frontmatter', function () {
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'full_path' => 'docs']);
    $post = Post::factory()->create(['namespace_id' => $namespace->id, 'slug' => 'guide', 'full_path' => 'docs/guide']);

    writeSyncFile($this->syncDir, 'docs/guide.md', "---\ntitle: Guide\ntags: [php, laravel]\n---\n\nContent.");

    $this->artisan('sync:watch', ['--once' => true])->assertSuccessful();

    $post->refresh();
    expect($post->tags->pluck('name')->sort()->values()->all())->toBe(['laravel', 'php']);
});

test('skips files with no matching post', function () {
    writeSyncFile($this->syncDir, 'nonexistent/post.md', "---\ntitle: Ghost\n---\n\nContent.");

    $this->artisan('sync:watch', ['--once' => true])->assertSuccessful();

    expect(Post::count())->toBe(0);
});

test('fails when SYNC_DIR is not configured', function () {
    config(['thinkstream.sync.directory' => null]);

    $this->artisan('sync:watch', ['--once' => true])->assertFailed();
});
