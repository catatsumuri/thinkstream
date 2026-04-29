<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostReferrer;
use App\Models\PostRevision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\Yaml\Yaml;

uses(RefreshDatabase::class);

function createNamespaceBackupZip(array $tree): string
{
    $zipPath = storage_path('framework/testing/'.Str::uuid().'.zip');
    $zip = new ZipArchive;

    expect($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE))->toBeTrue();

    addNamespaceBackupTreeToZip($zip, $tree);

    $zip->close();

    return $zipPath;
}

function addNamespaceBackupTreeToZip(ZipArchive $zip, array $tree, string $prefix = ''): void
{
    $zip->addFromString($prefix.'_namespace.yaml', Yaml::dump([
        'name' => $tree['name'],
        'slug' => $tree['slug'],
        'full_path' => $tree['full_path'] ?? $tree['slug'],
        'description' => $tree['description'] ?? null,
        'cover_image' => $tree['cover_image'] ?? null,
        'is_published' => $tree['is_published'] ?? true,
        'post_order' => $tree['post_order'] ?? [],
        'sort_order' => $tree['sort_order'] ?? null,
    ], 4));

    foreach ($tree['posts'] ?? [] as $post) {
        $frontmatter = [
            'title' => $post['title'],
            'slug' => $post['slug'],
            'full_path' => $post['full_path'] ?? (($tree['full_path'] ?? $tree['slug']).'/'.$post['slug']),
            'is_draft' => $post['is_draft'] ?? false,
            'published_at' => $post['published_at'] ?? now()->toIso8601String(),
        ];

        if (array_key_exists('page_views', $post)) {
            $frontmatter['page_views'] = $post['page_views'];
        }

        if (array_key_exists('referrers', $post)) {
            $frontmatter['referrers'] = $post['referrers'];
        }

        if (array_key_exists('reference_title', $post)) {
            $frontmatter['reference_title'] = $post['reference_title'];
        }

        if (array_key_exists('reference_url', $post)) {
            $frontmatter['reference_url'] = $post['reference_url'];
        }

        $zip->addFromString(
            $prefix.$post['slug'].'.md',
            "---\n".Yaml::dump($frontmatter)."---\n\n".rtrim($post['content'])."\n"
        );

        if (! empty($post['revisions'])) {
            $zip->addFromString(
                $prefix.$post['slug'].'.revisions.json',
                json_encode($post['revisions'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );
        }
    }

    foreach ($tree['children'] ?? [] as $child) {
        addNamespaceBackupTreeToZip($zip, $child, $prefix.$child['slug'].'/');
    }

    foreach ($tree['files'] ?? [] as $path => $content) {
        $zip->addFromString('_files/'.ltrim($path, '/'), $content);
    }
}

test('namespace backup command exports namespace metadata and markdown posts', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'full_path' => 'guides',
        'description' => 'Step-by-step guides.',
        'cover_image' => 'namespaces/guides-cover.jpg',
        'post_order' => ['routing'],
    ]);

    Storage::disk('public')->put('namespaces/guides-cover.jpg', 'cover-image-bytes');
    Storage::disk('public')->put('posts/123/diagram.png', 'diagram-image-bytes');

    $namespace->forceFill(['sort_order' => 3])->save();

    $routingPost = Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'title' => 'Routing',
        'slug' => 'routing',
        'full_path' => 'guides/routing',
        'page_views' => 42,
        'reference_title' => 'Laravel Routing Docs',
        'reference_url' => 'https://laravel.com/docs/routing',
        'content' => "# Routing\n\n![Diagram](/images/posts/123/diagram.png)\n\nBackup me.",
    ]);
    PostReferrer::create([
        'post_id' => $routingPost->id,
        'http_referer' => 'https://example.com/search?q=routing',
        'referrer_host' => 'example.com',
        'count' => 5,
    ]);

    $zipPath = storage_path('framework/testing/'.Str::uuid().'.zip');

    $this->artisan('namespace:backup', [
        'namespace' => $namespace->slug,
        '--output' => $zipPath,
        '--description' => 'Pre-release backup',
    ])->assertSuccessful();

    expect($zipPath)->toBeFile();

    $zip = new ZipArchive;
    expect($zip->open($zipPath))->toBeTrue();

    $namespaceData = Yaml::parse($zip->getFromName('_namespace.yaml'));
    $backupData = Yaml::parse($zip->getFromName('_backup.yaml'));
    $postMarkdown = $zip->getFromName('routing.md');
    $coverImage = $zip->getFromName('_files/namespaces/guides-cover.jpg');
    $postImage = $zip->getFromName('_files/posts/123/diagram.png');
    $zip->close();

    expect($namespaceData)->toMatchArray([
        'slug' => 'guides',
        'name' => 'Guides',
        'full_path' => 'guides',
        'description' => 'Step-by-step guides.',
        'cover_image' => 'namespaces/guides-cover.jpg',
        'post_order' => ['routing'],
        'sort_order' => 3,
    ]);

    expect($backupData)->toMatchArray([
        'description' => 'Pre-release backup',
    ]);

    expect($postMarkdown)->toContain('title: Routing')
        ->toContain('slug: routing')
        ->toContain('full_path: guides/routing')
        ->toContain('page_views: 42')
        ->toContain('referrers:')
        ->toContain('https://example.com/search?q=routing')
        ->toContain("reference_title: 'Laravel Routing Docs'")
        ->toContain("reference_url: 'https://laravel.com/docs/routing'")
        ->toContain('![Diagram](/images/posts/123/diagram.png)')
        ->toContain("# Routing\n\n![Diagram](/images/posts/123/diagram.png)\n\nBackup me.")
        ->and($coverImage)->toBe('cover-image-bytes')
        ->and($postImage)->toBe('diagram-image-bytes');

    File::delete($zipPath);
});

test('namespace restore command imports a namespace backup zip', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $zipPath = createNamespaceBackupZip([
        'slug' => 'laravel-13',
        'name' => 'Laravel 13',
        'full_path' => 'laravel-13',
        'description' => 'Laravel 13 upgrade guides.',
        'cover_image' => 'namespaces/laravel-13-cover.jpg',
        'post_order' => ['laravel-ai-sdk', 'upgrade-12-to-13'],
        'posts' => [
            [
                'title' => 'Laravel AI SDK',
                'slug' => 'laravel-ai-sdk',
                'page_views' => 11,
                'referrers' => [['url' => 'https://example.com/docs/ai', 'count' => 3]],
                'reference_title' => 'Laravel AI SDK Docs',
                'reference_url' => 'https://laravel.com/docs/ai',
                'content' => "# Laravel AI SDK\n\n![Diagram](/images/posts/legacy-id/ai-sdk.png)\n\nIntro.",
            ],
            [
                'title' => 'Upgrade 12 to 13',
                'slug' => 'upgrade-12-to-13',
                'content' => "# Upgrade 12 to 13\n\nChecklist.",
            ],
        ],
        'files' => [
            'namespaces/laravel-13-cover.jpg' => 'cover-from-backup',
            'posts/legacy-id/ai-sdk.png' => 'post-image-from-backup',
        ],
    ]);

    try {
        Storage::disk('public')->put('namespaces/laravel-13-cover.jpg', 'stale-cover');
        Storage::disk('public')->put('posts/legacy-id/ai-sdk.png', 'stale-post-image');

        $this->artisan('namespace:restore', [
            'path' => $zipPath,
        ])->assertSuccessful();

        $namespace = PostNamespace::query()->where('slug', 'laravel-13')->first();

        expect($namespace)->not->toBeNull()
            ->and($namespace->name)->toBe('Laravel 13')
            ->and($namespace->full_path)->toBe('laravel-13')
            ->and($namespace->cover_image)->toBe('namespaces/laravel-13-cover.jpg');

        $posts = Post::query()
            ->where('namespace_id', $namespace->id)
            ->orderBy('slug')
            ->get();

        $aiSdkPost = $posts->firstWhere('slug', 'laravel-ai-sdk');
        $aiSdkReferrer = PostReferrer::where('post_id', $aiSdkPost?->id)->first();

        expect($posts)->toHaveCount(2)
            ->and($posts->pluck('slug')->all())->toBe([
                'laravel-ai-sdk',
                'upgrade-12-to-13',
            ])
            ->and($aiSdkPost?->page_views)->toBe(11)
            ->and($aiSdkReferrer?->http_referer)->toBe('https://example.com/docs/ai')
            ->and($aiSdkReferrer?->count)->toBe(3)
            ->and($aiSdkPost?->reference_title)->toBe('Laravel AI SDK Docs')
            ->and($aiSdkPost?->reference_url)->toBe('https://laravel.com/docs/ai')
            ->and($posts->firstWhere('slug', 'upgrade-12-to-13')?->page_views)->toBe(0)
            ->and(PostReferrer::whereIn('post_id', $posts->pluck('id'))->count())->toBe(1)
            ->and($posts->pluck('user_id')->unique()->all())->toBe([$user->id]);

        Storage::disk('public')->assertExists('namespaces/laravel-13-cover.jpg');
        Storage::disk('public')->assertExists('posts/legacy-id/ai-sdk.png');
        expect(Storage::disk('public')->get('namespaces/laravel-13-cover.jpg'))->toBe('cover-from-backup')
            ->and(Storage::disk('public')->get('posts/legacy-id/ai-sdk.png'))->toBe('post-image-from-backup');
    } finally {
        File::delete($zipPath);
    }
});

test('namespace backup and restore commands preserve nested namespaces and posts', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'inertiajs-v3',
        'name' => 'Inertia.js v3',
        'description' => 'Inertia.js v3 guides.',
        'post_order' => ['childspace', 'overview'],
    ]);

    $childNamespace = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'childspace',
        'name' => 'Child Space',
        'description' => 'Nested guides.',
        'post_order' => ['page'],
    ]);

    Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'title' => 'Overview',
        'slug' => 'overview',
        'content' => "# Overview\n\nTop-level guide.",
    ]);

    Post::factory()->for($user)->for($childNamespace, 'namespace')->published()->create([
        'title' => 'Page',
        'slug' => 'page',
        'content' => "# Page\n\nNested guide.",
    ]);

    $zipPath = storage_path('framework/testing/'.Str::uuid().'.zip');

    $this->artisan('namespace:backup', [
        'namespace' => $namespace->slug,
        '--output' => $zipPath,
    ])->assertSuccessful();

    $zip = new ZipArchive;
    expect($zip->open($zipPath))->toBeTrue()
        ->and($zip->getFromName('_namespace.yaml'))->not->toBeFalse()
        ->and($zip->getFromName('overview.md'))->toContain('title: Overview')
        ->and($zip->getFromName('childspace/_namespace.yaml'))->not->toBeFalse()
        ->and($zip->getFromName('childspace/page.md'))->toContain('title: Page');
    $zip->close();

    Post::query()->delete();
    PostNamespace::query()->delete();

    $this->artisan('namespace:restore', [
        'path' => $zipPath,
    ])->assertSuccessful();

    $restoredNamespace = PostNamespace::query()
        ->where('slug', 'inertiajs-v3')
        ->first();
    $restoredChildNamespace = PostNamespace::query()
        ->where('slug', 'childspace')
        ->first();
    $restoredRootPost = Post::query()->where('slug', 'overview')->first();
    $restoredChildPost = Post::query()->where('slug', 'page')->first();

    expect($restoredNamespace)->not->toBeNull()
        ->and($restoredNamespace->parent_id)->toBeNull()
        ->and($restoredNamespace->full_path)->toBe('inertiajs-v3')
        ->and($restoredNamespace->post_order)->toBe(['childspace', 'overview'])
        ->and($restoredChildNamespace)->not->toBeNull()
        ->and($restoredChildNamespace->parent_id)->toBe($restoredNamespace->id)
        ->and($restoredChildNamespace->full_path)->toBe('inertiajs-v3/childspace')
        ->and($restoredChildNamespace->post_order)->toBe(['page'])
        ->and($restoredRootPost)->not->toBeNull()
        ->and($restoredRootPost->namespace_id)->toBe($restoredNamespace->id)
        ->and($restoredRootPost->full_path)->toBe('inertiajs-v3/overview')
        ->and($restoredChildPost)->not->toBeNull()
        ->and($restoredChildPost->namespace_id)->toBe($restoredChildNamespace->id)
        ->and($restoredChildPost->full_path)->toBe('inertiajs-v3/childspace/page');

    File::delete($zipPath);
});

test('namespace restore command defaults page views to zero for older backups', function () {
    $user = User::factory()->create();
    $zipPath = createNamespaceBackupZip([
        'slug' => 'legacy',
        'name' => 'Legacy',
        'full_path' => 'legacy',
        'posts' => [
            [
                'title' => 'Old Post',
                'slug' => 'old-post',
                'content' => 'Legacy content',
            ],
        ],
    ]);

    try {
        $this->artisan('namespace:restore', [
            'path' => $zipPath,
        ])->assertSuccessful();

        $post = Post::query()->where('full_path', 'legacy/old-post')->first();

        expect($post)->not->toBeNull()
            ->and($post->user_id)->toBe($user->id)
            ->and($post->page_views)->toBe(0)
            ->and(PostReferrer::where('post_id', $post->id)->count())->toBe(0);
    } finally {
        File::delete($zipPath);
    }
});

test('namespace restore command fails when no user exists', function () {
    $zipPath = createNamespaceBackupZip([
        'slug' => 'laravel-13',
        'name' => 'Laravel 13',
        'full_path' => 'laravel-13',
        'posts' => [
            [
                'title' => 'Laravel AI SDK',
                'slug' => 'laravel-ai-sdk',
                'content' => "# Laravel AI SDK\n\nIntro.",
            ],
        ],
    ]);

    try {
        $this->artisan('namespace:restore', [
            'path' => $zipPath,
        ])->expectsOutput('Cannot restore posts without an existing user.')
            ->assertFailed();

        expect(PostNamespace::query()->where('slug', 'laravel-13')->exists())->toBeFalse()
            ->and(Post::query()->count())->toBe(0);
    } finally {
        File::delete($zipPath);
    }
});

test('namespace backup --with-revisions includes revision json files', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs', 'name' => 'Docs']);
    $post = Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'title' => 'Intro',
        'slug' => 'intro',
        'content' => 'Hello.',
    ]);
    PostRevision::factory()->create([
        'post_id' => $post->id,
        'user_id' => $user->id,
        'title' => 'Old Intro',
        'content' => 'Old hello.',
        'created_at' => now()->subHour(),
    ]);

    $zipPath = storage_path('framework/testing/'.Str::uuid().'.zip');

    $this->artisan('namespace:backup', [
        'namespace' => $namespace->slug,
        '--output' => $zipPath,
        '--with-revisions' => true,
    ])->assertSuccessful();

    $zip = new ZipArchive;
    expect($zip->open($zipPath))->toBeTrue();
    $revisionsJson = $zip->getFromName('intro.revisions.json');
    $zip->close();

    expect($revisionsJson)->not->toBeFalse();
    $revisions = json_decode($revisionsJson, true);
    expect($revisions)->toHaveCount(1)
        ->and($revisions[0]['title'])->toBe('Old Intro')
        ->and($revisions[0]['content'])->toBe('Old hello.')
        ->and($revisions[0]['user_name'])->toBe($user->name);

    File::delete($zipPath);
});

test('namespace backup without --with-revisions does not include revision files', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'docs2', 'name' => 'Docs2']);
    $post = Post::factory()->for($user)->for($namespace, 'namespace')->published()->create([
        'slug' => 'intro',
        'content' => 'Hello.',
    ]);
    PostRevision::factory()->create(['post_id' => $post->id]);

    $zipPath = storage_path('framework/testing/'.Str::uuid().'.zip');

    $this->artisan('namespace:backup', [
        'namespace' => $namespace->slug,
        '--output' => $zipPath,
    ])->assertSuccessful();

    $zip = new ZipArchive;
    expect($zip->open($zipPath))->toBeTrue();
    $revisionsJson = $zip->getFromName('intro.revisions.json');
    $zip->close();

    expect($revisionsJson)->toBeFalse();

    File::delete($zipPath);
});

test('namespace restore --with-revisions imports revisions from backup', function () {
    $user = User::factory()->create();
    $zipPath = createNamespaceBackupZip([
        'slug' => 'my-ns',
        'name' => 'My NS',
        'full_path' => 'my-ns',
        'posts' => [
            [
                'title' => 'Guide',
                'slug' => 'guide',
                'content' => '# Guide',
                'revisions' => [
                    [
                        'title' => 'Old Guide',
                        'content' => '# Old Guide',
                        'user_name' => 'Alice',
                        'created_at' => now()->subDay()->toIso8601String(),
                    ],
                ],
            ],
        ],
    ]);

    try {
        $this->artisan('namespace:restore', [
            'path' => $zipPath,
            '--with-revisions' => true,
        ])->assertSuccessful();

        $post = Post::query()->where('slug', 'guide')->firstOrFail();
        expect($post->revisions()->count())->toBe(1);
        $revision = $post->revisions()->first();
        expect($revision->title)->toBe('Old Guide')
            ->and($revision->content)->toBe('# Old Guide')
            ->and($revision->user_id)->toBeNull();
    } finally {
        File::delete($zipPath);
    }
});

test('namespace restore without --with-revisions skips revision files', function () {
    $user = User::factory()->create();
    $zipPath = createNamespaceBackupZip([
        'slug' => 'my-ns2',
        'name' => 'My NS2',
        'full_path' => 'my-ns2',
        'posts' => [
            [
                'title' => 'Guide',
                'slug' => 'guide',
                'content' => '# Guide',
                'revisions' => [
                    ['title' => 'Old', 'content' => 'Old', 'user_name' => null, 'created_at' => now()->subDay()->toIso8601String()],
                ],
            ],
        ],
    ]);

    try {
        $this->artisan('namespace:restore', [
            'path' => $zipPath,
        ])->assertSuccessful();

        $post = Post::query()->where('slug', 'guide')->firstOrFail();
        expect($post->revisions()->count())->toBe(0);
    } finally {
        File::delete($zipPath);
    }
});

test('namespace restore command rejects zip entries with path traversal segments', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $zipPath = storage_path('framework/testing/'.Str::uuid().'.zip');
    $zip = new ZipArchive;

    expect($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE))->toBeTrue();
    $zip->addFromString('_namespace.yaml', Yaml::dump([
        'name' => 'Unsafe',
        'slug' => 'unsafe',
        'full_path' => 'unsafe',
    ], 4));
    $zip->addFromString('intro.md', "---\n".Yaml::dump([
        'title' => 'Intro',
        'slug' => 'intro',
        'full_path' => 'unsafe/intro',
    ])."---\n\nUnsafe content\n");
    $zip->addFromString('_files/../escape.txt', 'bad');
    $zip->close();

    try {
        $this->artisan('namespace:restore', [
            'path' => $zipPath,
        ])->expectsOutput('The restore archive contains an invalid file path.')
            ->assertFailed();

        expect(PostNamespace::query()->where('slug', 'unsafe')->exists())->toBeFalse()
            ->and(Post::query()->count())->toBe(0);
        Storage::disk('public')->assertMissing('escape.txt');
    } finally {
        File::delete($zipPath);
    }
});
