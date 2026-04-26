<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoutingCheckSeeder;
use Database\Seeders\SyntaxSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Yaml\Yaml;

uses(RefreshDatabase::class);

function withinIsolatedNamespaceBackupDirectory(callable $callback): mixed
{
    $backupDirectory = storage_path('app/private/backups');
    $stashedBackupDirectory = storage_path('framework/testing/backups-'.Str::uuid());
    $hadExistingBackups = is_dir($backupDirectory);

    if ($hadExistingBackups) {
        File::ensureDirectoryExists(dirname($stashedBackupDirectory));
        rename($backupDirectory, $stashedBackupDirectory);
    }

    File::ensureDirectoryExists($backupDirectory);

    try {
        return $callback($backupDirectory);
    } finally {
        File::deleteDirectory($backupDirectory);

        if ($hadExistingBackups) {
            rename($stashedBackupDirectory, $backupDirectory);
        }
    }
}

test('database seeder creates only the syntax namespace', function () {
    withinIsolatedNamespaceBackupDirectory(function (): void {
        $this->seed(DatabaseSeeder::class);

        expect(PostNamespace::query()->pluck('slug')->all())->toBe(['syntax']);
    });
});

test('syntax seeder creates the zenn syntax guide with code block examples', function () {
    $this->seed(SyntaxSeeder::class);

    $namespace = PostNamespace::query()
        ->where('slug', 'syntax')
        ->first();

    expect($namespace)->not->toBeNull();
    expect($namespace->post_order)->toContain('zenn-syntax');

    $post = Post::query()
        ->where('namespace_id', $namespace->id)
        ->where('slug', 'zenn-syntax')
        ->first();

    expect($post)->not->toBeNull();
    expect($post->title)->toBe('Zenn Syntax');
    expect($post->content)->toContain('## Basic Image');
    expect($post->content)->toContain('## Sized Image');
    expect($post->content)->toContain('## Alt Text');
    expect($post->content)->toContain('## Caption');
    expect($post->content)->toContain('## Linked Image');
    expect($post->content)->toContain('## Code Block with Filename');
    expect($post->content)->toContain('```php:index.php');
    expect($post->content)->toContain('## Diff Highlighting');
    expect($post->content)->toContain('```diff ts:src/utils.ts');
    expect($post->content)->toContain('## GitHub Embed');
    expect($post->content)->toContain('https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json');
    expect($post->content)->toContain('@[github](https://github.com/zenn-dev/zenn-editor/blob/canary/lerna.json)');
    expect($post->content)->toContain('![Guide cover](/storage/namespaces/guide.png =250x)');
    expect($post->content)->toContain('![](/storage/namespaces/guide.png =250x)');
    expect($post->content)->toContain('*Guide cover image*');
    expect($post->content)->toContain('[![](/storage/namespaces/guide.png =250x)](https://zenn.dev)');
    expect($post->published_at)->not->toBeNull();
});

test('syntax seeder creates the mintlify syntax page', function () {
    $this->seed(SyntaxSeeder::class);

    $namespace = PostNamespace::query()
        ->where('slug', 'syntax')
        ->first();

    expect($namespace)->not->toBeNull();
    expect($namespace->post_order)->toContain('mintlify-syntax');

    $post = Post::query()
        ->where('namespace_id', $namespace->id)
        ->where('slug', 'mintlify-syntax')
        ->first();

    expect($post)->not->toBeNull();
    expect($post->title)->toBe('Mintlify Syntax');
    expect($post->content)->toContain('# Mintlify Syntax');
    expect($post->content)->toContain('<Card title="Tabs" icon="folder" href="/syntax/index">');
    expect($post->content)->toContain('<CardGroup cols={2}>');
    expect($post->content)->toContain('Rendered result for the same source:');
    expect($post->content)->toContain('Live example:');
    expect($post->content)->toContain('<Tabs>');
    expect($post->content)->toContain('<Tab title="yarn">');
    expect($post->content)->toContain('yarn install');
    expect($post->content)->toContain('<Accordion title="What is Mintlify?">');
    expect($post->content)->toContain('<Accordion title="How do I get started?" icon="rocket">');
    expect($post->content)->toContain('<Note>');
    expect($post->content)->toContain('<Warning>');
    expect($post->content)->toContain('<Check>');
    expect($post->content)->toContain('# Badge');
    expect($post->content)->toContain('<Badge color="green" icon="circle-check">Stable</Badge>');
    expect($post->content)->toContain('This feature requires a <Badge color="orange" size="sm">Premium</Badge> subscription.');
    expect($post->content)->toContain('# Tooltip');
    expect($post->content)->toContain('<Tooltip tip="Application Programming Interface: a set of protocols that lets software components communicate." headline="API" cta="Read more" href="/syntax/index">API</Tooltip>');
    expect($post->content)->toContain('Simple tooltip: hover over <Tooltip tip="Hypertext Markup Language — the standard language for web pages.">HTML</Tooltip>.');
    expect($post->content)->toContain('# Update');
    expect($post->content)->toContain('<Update label="2024-10-11" description="v0.2.0" tags={["Feature", "Improvement"]}>');
    expect($post->content)->toContain('## Improved card icon support');
    expect($post->content)->toContain('# Tree');
    expect($post->content)->toContain('<Tree>');
    expect($post->content)->toContain('<Tree.Folder name="app" defaultOpen>');
    expect($post->content)->toContain('<Tree.File name="package.json" />');
    expect($post->content)->toContain('<ResponseField name="id" type="string" required>');
    expect($post->content)->toContain('<ParamField path="slug" type="string" required>');
    expect($post->content)->toContain('```javascript JavaScript icon="javascript"');
    expect($post->content)->toContain('```python Python icon="python"');
    expect($post->content)->toContain('```php PHP icon="php"');
    expect($post->published_at)->not->toBeNull();
});

test('routing check seeder creates wildcard routing lookalike namespaces', function () {
    $this->seed(RoutingCheckSeeder::class);

    $apiaryNamespace = PostNamespace::query()->where('slug', 'apiary')->first();
    $administratorNamespace = PostNamespace::query()->where('slug', 'administrator')->first();

    expect($apiaryNamespace)->not->toBeNull();
    expect($administratorNamespace)->not->toBeNull();

    $apiaryPost = Post::query()
        ->where('namespace_id', $apiaryNamespace->id)
        ->where('slug', 'routing-check')
        ->first();
    $administratorPost = Post::query()
        ->where('namespace_id', $administratorNamespace->id)
        ->where('slug', 'routing-check')
        ->first();

    expect($apiaryPost)->not->toBeNull();
    expect($apiaryPost->content)->toContain('/apiary');
    expect($apiaryPost->content)->toContain('/api/*');

    expect($administratorPost)->not->toBeNull();
    expect($administratorPost->content)->toContain('/administrator');
    expect($administratorPost->content)->toContain('/admin/*');
});

test('syntax seeder does not create the meta namespace', function () {
    $this->seed(SyntaxSeeder::class);

    $namespace = PostNamespace::query()
        ->where('slug', 'meta')
        ->first();

    expect($namespace)->toBeNull();
});

test('database seeder restores the latest namespace backup for each slug', function () {
    Storage::fake('public');

    withinIsolatedNamespaceBackupDirectory(function (string $backupDirectory): void {
        $zipPath = $backupDirectory.'/'.Str::uuid().'.zip';
        $zip = new ZipArchive;

        expect($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE))->toBeTrue();

        $zip->addFromString('_namespace.yaml', Yaml::dump([
            'name' => 'Restored Docs',
            'slug' => 'restored-docs',
            'full_path' => 'restored-docs',
            'description' => 'Restored from backup seeder.',
            'is_published' => true,
            'post_order' => ['intro'],
        ], 4));

        $zip->addFromString('intro.md', "---\n".Yaml::dump([
            'title' => 'Intro',
            'slug' => 'intro',
            'full_path' => 'restored-docs/intro',
            'is_draft' => false,
            'published_at' => now()->toIso8601String(),
        ])."---\n\n# Intro\n\nRestored content.\n");

        $zip->close();

        $this->seed(DatabaseSeeder::class);

        $namespace = PostNamespace::query()->where('slug', 'restored-docs')->first();
        $post = Post::query()->where('full_path', 'restored-docs/intro')->first();

        expect($namespace)->not->toBeNull()
            ->and($namespace->full_path)->toBe('restored-docs')
            ->and($namespace->description)->toBe('Restored from backup seeder.')
            ->and($post)->not->toBeNull()
            ->and($post->title)->toBe('Intro');
    });
});
