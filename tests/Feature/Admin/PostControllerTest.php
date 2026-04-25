<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\Tag;
use App\Models\User;
use App\Support\NamespaceBackupArchive;
use App\Support\NamespaceRestoreArchive;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Yaml\Yaml;

uses(RefreshDatabase::class);

function createAdminNamespaceBackupZip(string $zipPath, array $tree): void
{
    $zip = new ZipArchive;

    expect($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE))->toBeTrue();

    addAdminNamespaceBackupTreeToZip($zip, $tree);

    $zip->close();
}

function addAdminNamespaceBackupTreeToZip(ZipArchive $zip, array $tree, string $prefix = ''): void
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

        if (array_key_exists('tags', $post)) {
            $frontmatter['tags'] = $post['tags'];
        }

        $zip->addFromString(
            $prefix.$post['slug'].'.md',
            "---\n".Yaml::dump($frontmatter)."---\n\n".rtrim($post['content'])."\n"
        );
    }

    foreach ($tree['children'] ?? [] as $child) {
        addAdminNamespaceBackupTreeToZip($zip, $child, $prefix.$child['slug'].'/');
    }

    foreach ($tree['files'] ?? [] as $path => $content) {
        $zip->addFromString('_files/'.ltrim($path, '/'), $content);
    }
}

test('guests are redirected from the posts index', function () {
    $this->get(route('admin.posts.index'))->assertRedirect(route('login'));
});

test('authenticated users can view the posts index (namespace list)', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.index'))->assertOk();
});

test('posts index only shows root namespaces with children nested', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create(['name' => 'Root', 'parent_id' => null]);
    $child = PostNamespace::factory()->create(['name' => 'Child', 'parent_id' => $root->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.index'))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/index')
            ->has('namespaces', 1)
            ->where('namespaces.0.id', $root->id)
            ->has('namespaces.0.children', 1)
            ->where('namespaces.0.children.0.id', $child->id)
        );
});

test('posts index defaults to namespace sort order', function () {
    $user = User::factory()->create();
    $first = PostNamespace::factory()->create(['name' => 'Beta', 'sort_order' => 1]);
    $second = PostNamespace::factory()->create(['name' => 'Alpha', 'sort_order' => 0]);
    $last = PostNamespace::factory()->create(['name' => 'Gamma', 'sort_order' => null]);

    $this->actingAs($user)
        ->get(route('admin.posts.index'))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/index')
            ->has('sort', fn ($sort) => $sort
                ->where('column', 'sort_order')
                ->where('direction', 'asc')
            )
            ->where('namespaces.0.id', $second->id)
            ->where('namespaces.1.id', $first->id)
            ->where('namespaces.2.id', $last->id)
        );
});

test('posts index exposes root restore upload metadata', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.posts.index'))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/index')
            ->where('restore_upload_url', route('admin.posts.restore.upload', absolute: false))
            ->where('restore_preview', null)
        );
});

test('posts index uses url sort params when provided', function () {
    $user = User::factory()->create();
    $topNamespace = PostNamespace::factory()->create();
    $bottomNamespace = PostNamespace::factory()->create();
    Post::factory()->for($user)->create(['namespace_id' => $topNamespace->id]);
    Post::factory()->for($user)->create(['namespace_id' => $topNamespace->id]);
    Post::factory()->for($user)->create(['namespace_id' => $bottomNamespace->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.index', ['sort' => 'posts_count', 'dir' => 'desc']))
        ->assertInertia(fn ($page) => $page
            ->has('sort', fn ($sort) => $sort
                ->where('column', 'posts_count')
                ->where('direction', 'desc')
            )
            ->where('namespaces.0.id', $topNamespace->id)
            ->where('namespaces.1.id', $bottomNamespace->id)
        );
});

test('authenticated users can view the namespace post list', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.namespace', $namespace))->assertOk();
});

test('create form includes available tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);
    Tag::firstOrCreate(['name' => 'php']);
    Tag::firstOrCreate(['name' => 'laravel']);

    $this->actingAs($user)
        ->get(route('admin.posts.create', $namespace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/create')
            ->where('slugPrefix', 'guides/')
            ->where('availableTags', ['laravel', 'php'])
        );
});

test('uploading a restore zip from the posts index returns a restore preview', function () {
    $user = User::factory()->create();
    $existingNamespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
        'name' => 'Guides',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $existingNamespace->id,
        'slug' => 'intro',
        'title' => 'Intro',
        'content' => 'Existing intro',
    ]);

    $zipPath = storage_path('framework/testing/'.str()->uuid().'.zip');
    createAdminNamespaceBackupZip($zipPath, [
        'slug' => 'guides',
        'name' => 'Guides',
        'full_path' => 'guides',
        'posts' => [
            [
                'title' => 'Intro',
                'slug' => 'intro',
                'full_path' => 'guides/intro',
                'content' => 'Restored intro',
            ],
            [
                'title' => 'Fresh',
                'slug' => 'fresh',
                'full_path' => 'guides/fresh',
                'content' => 'Fresh content',
            ],
        ],
        'children' => [
            [
                'slug' => 'api',
                'name' => 'API',
                'full_path' => 'guides/api',
                'posts' => [
                    [
                        'title' => 'Endpoints',
                        'slug' => 'endpoints',
                        'full_path' => 'guides/api/endpoints',
                        'content' => 'API docs',
                    ],
                ],
            ],
        ],
    ]);

    try {
        $upload = new UploadedFile($zipPath, 'restore.zip', 'application/zip', null, true);

        $response = $this->actingAs($user)
            ->post(route('admin.posts.restore.upload'), [
                'backup' => $upload,
            ]);

        $location = $response->headers->get('Location');

        expect($location)->not->toBeNull()->and($location)->toContain('/admin/posts?restore=');

        $this->actingAs($user)
            ->get($location)
            ->assertInertia(fn ($page) => $page
                ->component('admin/posts/index')
                ->where('restore_preview.root.full_path', 'guides')
                ->where('restore_preview.root.status', 'existing')
                ->where('restore_preview.totals.namespace_count', 2)
                ->where('restore_preview.totals.existing_namespace_count', 1)
                ->where('restore_preview.totals.new_namespace_count', 1)
                ->where('restore_preview.totals.post_count', 3)
                ->where('restore_preview.totals.existing_post_count', 1)
                ->where('restore_preview.totals.new_post_count', 2)
                ->where('restore_preview.namespaces.0.full_path', 'guides')
                ->where('restore_preview.namespaces.1.full_path', 'guides/api')
            );
    } finally {
        File::delete($zipPath);
    }
});

test('namespace post list exposes ancestors for breadcrumb', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create(['name' => 'Guides']);
    $child = PostNamespace::factory()->create(['name' => 'Laravel', 'parent_id' => $root->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $child))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/namespace')
            ->has('ancestors', 1)
            ->where('ancestors.0.id', $root->id)
            ->where('ancestors.0.name', 'Guides')
        );
});

test('root namespace post list has empty ancestors', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $root))
        ->assertInertia(fn ($page) => $page
            ->has('ancestors', 0)
        );
});

test('namespace post list includes child namespaces', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create();
    $child = PostNamespace::factory()->create(['parent_id' => $parent->id]);
    $other = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $parent))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/namespace')
            ->has('children', 1)
            ->where('children.0.id', $child->id)
        );
});

test('namespace post list defaults to latest posts when no custom order exists', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $olderPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'created_at' => now()->subDay(),
    ]);
    $newerPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'created_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $namespace))
        ->assertInertia(fn ($page) => $page
            ->where('posts.0.id', $newerPost->id)
            ->where('posts.1.id', $olderPost->id)
        );
});

test('namespace post list prefers canonical urls for live posts and admin urls for unpublished posts', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);
    $livePost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'live-post',
        'full_path' => 'guides/live-post',
        'is_draft' => false,
        'published_at' => now()->subMinute(),
    ]);
    $draftPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'draft-post',
        'full_path' => 'guides/draft-post',
        'is_draft' => true,
        'published_at' => null,
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $namespace))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/namespace')
            ->where('delete_posts_url', route('admin.posts.destroyMany', $namespace, false))
            ->where('posts.0.id', $draftPost->id)
            ->where('posts.0.canonical_url', null)
            ->where('posts.0.admin_url', route('admin.posts.show', [$namespace, $draftPost], false))
            ->where('posts.1.id', $livePost->id)
            ->where('posts.1.canonical_url', '/guides/live-post')
            ->where('posts.1.admin_url', route('admin.posts.show', [$namespace, $livePost], false))
        );
});

test('namespace post list includes backup management metadata when backups exist', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-meta',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $firstBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-010203.zip';
    $secondBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-040506.zip';
    $foreignBackup = $backupDirectory.'/other-20260421-070809.zip';

    File::put($firstBackup, 'backup-1');
    File::put($secondBackup, 'backup-2');
    File::put($foreignBackup, 'backup-3');

    try {
        $this->actingAs($user)
            ->get(route('admin.posts.namespace', $namespace))
            ->assertInertia(fn ($page) => $page
                ->component('admin/posts/namespace')
                ->where('namespace.backup_count', 2)
                ->where('namespace.backup_management_url', route('admin.posts.backups', $namespace, false))
            );
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
        File::delete([$foreignBackup]);
    }
});

test('namespace post list includes backup management metadata when backups do not exist', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-empty-meta',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    try {
        $this->actingAs($user)
            ->get(route('admin.posts.namespace', $namespace))
            ->assertInertia(fn ($page) => $page
                ->component('admin/posts/namespace')
                ->where('namespace.backup_count', 0)
                ->where('namespace.backup_management_url', route('admin.posts.backups', $namespace, false))
            );
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('authenticated users can view the namespace backup management page', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-page',
        'name' => 'Guides',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $latestBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-040506.zip';
    $olderBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-010203.zip';

    File::put($olderBackup, 'older');
    touch($olderBackup, now()->subHour()->timestamp);
    File::put($latestBackup, 'latest');
    touch($latestBackup, now()->timestamp);

    try {
        $this->actingAs($user)
            ->get(route('admin.posts.backups', $namespace))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/posts/backups')
                ->where('namespace.id', $namespace->id)
                ->where('namespace.name', 'Guides')
                ->where('namespace.backup_count', 2)
                ->where('create_backup_url', route('admin.posts.backups.store', $namespace, false))
                ->has('backups', 2)
                ->where('backups.0.filename', basename($latestBackup))
                ->where('backups.1.filename', basename($olderBackup))
                ->where('backups.0.download_url', route('admin.posts.backups.download', [
                    'namespace' => $namespace,
                    'backup' => basename($latestBackup),
                ], false))
                ->where('backups.0.restore_url', route('admin.posts.backups.restore', [
                    'namespace' => $namespace,
                    'backup' => basename($latestBackup),
                ], false))
            );
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('namespace backup management separates namespaces that share the same slug', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create([
        'slug' => 'docs',
        'full_path' => 'docs',
    ]);
    $namespace = PostNamespace::factory()->create([
        'parent_id' => $parent->id,
        'slug' => 'guides',
        'full_path' => 'docs/guides',
        'name' => 'Nested Guides',
    ]);
    $otherNamespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
        'name' => 'Root Guides',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $namespacePrefix = NamespaceBackupArchive::currentPrefix($namespace);
    $otherPrefix = NamespaceBackupArchive::currentPrefix($otherNamespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete([
        ...File::glob($backupDirectory.'/'.$namespacePrefix.'-*.zip'),
        ...File::glob($backupDirectory.'/'.$otherPrefix.'-*.zip'),
    ]);

    $nestedBackup = $backupDirectory.'/'.$namespacePrefix.'-20260421-010203.zip';
    $rootBackup = $backupDirectory.'/'.$otherPrefix.'-20260421-040506.zip';

    File::put($nestedBackup, 'nested');
    File::put($rootBackup, 'root');

    try {
        $this->actingAs($user)
            ->get(route('admin.posts.backups', $namespace))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/posts/backups')
                ->where('namespace.id', $namespace->id)
                ->where('namespace.backup_count', 1)
                ->has('backups', 1)
                ->where('backups.0.filename', basename($nestedBackup))
            );
    } finally {
        File::delete([
            ...File::glob($backupDirectory.'/'.$namespacePrefix.'-*.zip'),
            ...File::glob($backupDirectory.'/'.$otherPrefix.'-*.zip'),
        ]);
    }
});

test('namespace backup management includes legacy id-prefixed backups', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-legacy-backup',
        'full_path' => 'guides-legacy-backup',
        'name' => 'Guides Legacy Backup',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    $legacyPrefix = 'namespace-'.$namespace->id.'-'.$backupPrefix;
    File::ensureDirectoryExists($backupDirectory);
    File::delete([
        ...File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'),
        ...File::glob($backupDirectory.'/'.$legacyPrefix.'-*.zip'),
    ]);

    $legacyBackup = $backupDirectory.'/'.$legacyPrefix.'-20260421-040506.zip';
    File::put($legacyBackup, 'legacy');

    try {
        $this->actingAs($user)
            ->get(route('admin.posts.backups', $namespace))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/posts/backups')
                ->where('namespace.id', $namespace->id)
                ->where('namespace.backup_count', 1)
                ->has('backups', 1)
                ->where('backups.0.filename', basename($legacyBackup))
            );
    } finally {
        File::delete([
            ...File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'),
            ...File::glob($backupDirectory.'/'.$legacyPrefix.'-*.zip'),
        ]);
    }
});

test('authenticated users can create a namespace backup from backup management', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-create',
        'name' => 'Guides',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    try {
        $this->actingAs($user)
            ->post(route('admin.posts.backups.store', $namespace))
            ->assertRedirect(route('admin.posts.backups', $namespace))
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'success',
                'message' => 'Backup created.',
            ]);

        expect(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'))
            ->toHaveCount(1);
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('authenticated users can delete selected namespace backups from backup management', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-delete',
        'name' => 'Guides',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $firstBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-010203.zip';
    $secondBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-040506.zip';
    $thirdBackup = $backupDirectory.'/'.$backupPrefix.'-20260421-070809.zip';

    File::put($firstBackup, 'backup-1');
    File::put($secondBackup, 'backup-2');
    File::put($thirdBackup, 'backup-3');

    try {
        $this->actingAs($user)
            ->post(route('admin.posts.backups.destroyMany', $namespace), [
                'filenames' => [
                    basename($firstBackup),
                    basename($thirdBackup),
                ],
            ])
            ->assertRedirect(route('admin.posts.backups', $namespace))
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'success',
                'message' => 'Selected backups deleted.',
            ]);

        expect(File::exists($firstBackup))->toBeFalse()
            ->and(File::exists($thirdBackup))->toBeFalse()
            ->and(File::exists($secondBackup))->toBeTrue();
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('restoring a namespace backup requires matching confirmation text', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-confirmation',
        'name' => 'Guides',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $zipPath = $backupDirectory.'/'.$backupPrefix.'-20260421-040506.zip';
    createAdminNamespaceBackupZip($zipPath, [
        'slug' => 'guides-backup-confirmation',
        'name' => 'Guides',
        'description' => 'Updated from backup.',
    ]);

    try {
        $this->actingAs($user)
            ->from(route('admin.posts.backups', $namespace))
            ->post(route('admin.posts.backups.restore', [
                'namespace' => $namespace,
                'backup' => basename($zipPath),
            ]), [
                'confirmation' => 'wrong text',
            ])
            ->assertRedirect(route('admin.posts.backups', $namespace))
            ->assertSessionHasErrors('confirmation');

        expect($namespace->fresh()->description)->not->toBe('Updated from backup.');
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('authenticated users can restore a namespace from an existing backup', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-restore',
        'name' => 'Guides',
        'description' => 'Old description',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'intro',
        'title' => 'Old Intro',
        'content' => 'Old content',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $zipPath = $backupDirectory.'/'.$backupPrefix.'-20260421-040506.zip';
    createAdminNamespaceBackupZip($zipPath, [
        'slug' => 'guides-backup-restore',
        'name' => 'Guides',
        'description' => 'Restored description',
        'posts' => [
            [
                'title' => 'Intro',
                'slug' => 'intro',
                'content' => 'Restored content',
            ],
        ],
    ]);

    try {
        $this->actingAs($user)
            ->post(route('admin.posts.backups.restore', [
                'namespace' => $namespace,
                'backup' => basename($zipPath),
            ]), [
                'confirmation' => 'Guides',
            ])
            ->assertRedirect(route('admin.posts.backups', $namespace))
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'success',
                'message' => 'Backup restored.',
            ]);

        expect($namespace->fresh()->description)->toBe('Restored description');
        expect(Post::query()->where('namespace_id', $namespace->id)->where('slug', 'intro')->value('content'))
            ->toBe('Restored content');
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('root namespace restore stream applies the uploaded backup and emits progress updates', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-stream',
        'full_path' => 'guides-stream',
        'name' => 'Guides Stream',
        'description' => 'Old description',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'intro',
        'title' => 'Old Intro',
        'content' => 'Old content',
    ]);

    $restoreArchive = app(NamespaceRestoreArchive::class);
    $token = 'restore-stream-test';
    $zipPath = $restoreArchive->tokenPath($token);

    File::ensureDirectoryExists(dirname($zipPath));
    File::delete($zipPath);

    createAdminNamespaceBackupZip($zipPath, [
        'slug' => 'guides-stream',
        'name' => 'Guides Stream',
        'full_path' => 'guides-stream',
        'description' => 'Restored description',
        'posts' => [
            [
                'title' => 'Intro',
                'slug' => 'intro',
                'full_path' => 'guides-stream/intro',
                'content' => 'Restored content',
            ],
            [
                'title' => 'Fresh Post',
                'slug' => 'fresh-post',
                'full_path' => 'guides-stream/fresh-post',
                'content' => 'Fresh content',
            ],
        ],
    ]);

    try {
        $response = $this->actingAs($user)
            ->get(route('admin.posts.restore.stream', ['token' => $token]));

        $response->assertOk()->assertStreamed();

        $streamedContent = $response->streamedContent();

        expect($streamedContent)->toContain('Starting namespace restore.')
            ->toContain('Updating namespace guides-stream')
            ->toContain('Updating post guides-stream\\/intro')
            ->toContain('Creating post guides-stream\\/fresh-post')
            ->toContain('Restored 2 posts.');

        expect($namespace->fresh()->description)->toBe('Restored description');
        expect(Post::query()->where('namespace_id', $namespace->id)->where('slug', 'intro')->value('content'))
            ->toBe('Restored content');
        expect(Post::query()->where('namespace_id', $namespace->id)->where('slug', 'fresh-post')->exists())
            ->toBeTrue();
        expect(File::exists($zipPath))->toBeFalse();
    } finally {
        File::delete($zipPath);
    }
});

test('root namespace restore stream deletes uploaded archive tokens after restore errors', function () {
    $user = User::factory()->create();
    $restoreArchive = app(NamespaceRestoreArchive::class);
    $token = 'restore-stream-error';
    $zipPath = $restoreArchive->tokenPath($token);

    File::ensureDirectoryExists(dirname($zipPath));
    File::put($zipPath, 'not-a-valid-zip');

    try {
        $response = $this->actingAs($user)
            ->get(route('admin.posts.restore.stream', ['token' => $token]));

        $response->assertOk()->assertStreamed();

        expect($response->streamedContent())->toContain('Failed to open zip:')
            ->and(File::exists($zipPath))->toBeFalse();
    } finally {
        File::delete($zipPath);
    }
});

test('authenticated users can download an existing namespace backup zip', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-download',
        'name' => 'Guides',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $zipPath = $backupDirectory.'/'.$backupPrefix.'-20260421-040506.zip';
    File::put($zipPath, 'backup-download-payload');

    try {
        $this->actingAs($user)
            ->get(route('admin.posts.backups.download', [
                'namespace' => $namespace,
                'backup' => basename($zipPath),
            ]))
            ->assertOk()
            ->assertDownload(basename($zipPath))
            ->assertHeader('content-disposition', 'attachment; filename='.basename($zipPath));
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('authenticated users can reorder posts while preserving child namespace order', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'post_order' => ['child-alpha', 'first-post', 'child-beta', 'second-post'],
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'child-alpha',
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'child-beta',
    ]);
    $firstPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'first-post',
    ]);
    $secondPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'second-post',
    ]);

    $this->actingAs($user)
        ->from(route('admin.posts.namespace', $namespace))
        ->patch(route('admin.posts.reorderPosts', $namespace), [
            'slugs' => [$secondPost->slug, $firstPost->slug],
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace))
        ->assertSessionHasNoErrors();

    expect($namespace->fresh()->post_order)->toBe([
        'child-alpha',
        'child-beta',
        'second-post',
        'first-post',
    ]);
});

test('reordering posts rejects slugs outside the namespace posts', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'post_order' => ['child-alpha', 'first-post'],
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'child-alpha',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'first-post',
    ]);
    $foreignPost = Post::factory()->for($user)->create([
        'slug' => 'foreign-post',
    ]);

    $this->actingAs($user)
        ->from(route('admin.posts.namespace', $namespace))
        ->patch(route('admin.posts.reorderPosts', $namespace), [
            'slugs' => [$foreignPost->slug],
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace))
        ->assertSessionHasErrors('slugs.0');

    expect($namespace->fresh()->post_order)->toBe(['child-alpha', 'first-post']);
});

test('authenticated users can reorder child namespaces while preserving post order', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'post_order' => ['child-alpha', 'first-post', 'child-beta', 'second-post'],
    ]);
    $firstChild = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'child-alpha',
    ]);
    $secondChild = PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'child-beta',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'first-post',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'second-post',
    ]);

    $this->actingAs($user)
        ->from(route('admin.posts.namespace', $namespace))
        ->patch(route('admin.posts.reorderNamespaces', $namespace), [
            'slugs' => [$secondChild->slug, $firstChild->slug],
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace))
        ->assertSessionHasNoErrors();

    expect($namespace->fresh()->post_order)->toBe([
        'child-beta',
        'child-alpha',
        'first-post',
        'second-post',
    ]);
});

test('reordering child namespaces rejects slugs outside the namespace children', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'post_order' => ['child-alpha', 'first-post'],
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'child-alpha',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'first-post',
    ]);
    $foreignChild = PostNamespace::factory()->create([
        'slug' => 'foreign-child',
    ]);

    $this->actingAs($user)
        ->from(route('admin.posts.namespace', $namespace))
        ->patch(route('admin.posts.reorderNamespaces', $namespace), [
            'slugs' => [$foreignChild->slug],
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace))
        ->assertSessionHasErrors('slugs.0');

    expect($namespace->fresh()->post_order)->toBe(['child-alpha', 'first-post']);
});

test('authenticated users can view the create form', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.create', $namespace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/create')
            ->where('slugPrefix', 'guides/')
        );
});

test('create form exposes a slug prefix for nested namespaces', function () {
    $user = User::factory()->create();
    $parentNamespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);
    $namespace = PostNamespace::factory()->create([
        'parent_id' => $parentNamespace->id,
        'slug' => 'laravel',
        'full_path' => 'guides/laravel',
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.create', $namespace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/create')
            ->where('namespace.id', $namespace->id)
            ->where('slugPrefix', 'guides/laravel/')
        );
});

test('edit form exposes a slug prefix for root namespaces', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'test',
        'full_path' => 'guides/test',
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.edit', [$namespace, $post]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/edit')
            ->where('slugPrefix', 'guides/')
        );
});

test('authenticated users can store a post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Hello World',
            'slug' => 'hello-world',
            'content' => '# Hello\n\nThis is a test post.',
            'published_at' => null,
            'reference_title' => 'Laravel Routing',
            'reference_url' => 'https://laravel.com/docs/routing',
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('inertia.flash_data.toast', [
            'type' => 'success',
            'message' => 'Post created.',
        ])
        ->assertRedirect(route('admin.posts.show', [$namespace, 'hello-world']));

    $this->assertDatabaseHas('posts', [
        'namespace_id' => $namespace->id,
        'title' => 'Hello World',
        'slug' => 'hello-world',
        'user_id' => $user->id,
        'reference_title' => 'Laravel Routing',
        'reference_url' => 'https://laravel.com/docs/routing',
    ]);

    expect(Post::query()->where('slug', 'hello-world')->value('published_at'))->not->toBeNull();
});

test('storing a post redirects back to the canonical page when entered from a canonical namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Hello World',
            'slug' => 'hello-world',
            'content' => '# Hello',
            'published_at' => null,
            'return_to' => '/guides',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/guides/hello-world');
});

test('storing a post requires a title', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['slug' => 'my-post', 'content' => 'Some content'])
        ->assertSessionHasErrors('title');
});

test('storing a post requires a slug', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['title' => 'My Post', 'content' => 'Some content'])
        ->assertSessionHasErrors('slug');
});

test('storing a post requires a unique slug within the same namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    Post::factory()->for($user)->create(['namespace_id' => $namespace->id, 'slug' => 'taken-slug']);

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['title' => 'My Post', 'slug' => 'taken-slug', 'content' => 'Some content'])
        ->assertSessionHasErrors('slug');
});

test('the same slug is allowed in different namespaces', function () {
    $user = User::factory()->create();
    $namespaceA = PostNamespace::factory()->create();
    $namespaceB = PostNamespace::factory()->create();
    Post::factory()->for($user)->create(['namespace_id' => $namespaceA->id, 'slug' => 'shared-slug']);

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespaceB), ['title' => 'My Post', 'slug' => 'shared-slug', 'content' => 'Some content'])
        ->assertRedirect(route('admin.posts.show', [$namespaceB, 'shared-slug']));
});

test('storing a post rejects a slug used by a child namespace in the same namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guide']);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'markdown',
    ]);

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Markdown',
            'slug' => 'markdown',
            'content' => 'Some content',
        ])
        ->assertSessionHasErrors('slug');
});

test('storing a post requires content', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['title' => 'My Post', 'slug' => 'my-post'])
        ->assertSessionHasErrors('content');
});

test('authenticated users can view the edit form', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.edit', [$namespace, $post]))
        ->assertOk();
});

test('authenticated users can view a post details page', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'title' => 'Release Notes',
        'slug' => 'release-notes',
        'page_views' => 27,
        'is_draft' => false,
        'reference_title' => 'Release Notes Source',
        'reference_url' => 'https://example.com/release-notes',
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$namespace, $post]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/show')
            ->where('namespace.id', $namespace->id)
            ->where('post.id', $post->id)
            ->where('post.slug', 'release-notes')
            ->where('post.title', 'Release Notes')
            ->where('post.page_views', 27)
            ->where('post.reference_title', 'Release Notes Source')
            ->where('post.reference_url', 'https://example.com/release-notes')
        );
});

test('admin post details page includes post tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
    ]);
    $post->tags()->attach(Tag::firstOrCreate(['name' => 'laravel'])->id);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$namespace, $post]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/show')
            ->where('post.tags', ['laravel'])
        );
});

test('admin post details page includes admin navigation rooted at the top namespace', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create([
        'slug' => 'guides-admin-nav',
        'full_path' => 'guides-admin-nav',
        'name' => 'Guides Admin Nav',
    ]);
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
        'full_path' => 'guides-admin-nav/laravel',
        'name' => 'Laravel',
    ]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $child->id,
        'slug' => 'routing',
        'full_path' => 'guides-admin-nav/laravel/routing',
        'title' => 'Routing',
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$child, $post]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/show')
            ->where('navRoot.full_path', $root->full_path)
            ->where('navRoot.href', route('admin.posts.namespace', $root, false))
            ->where('navRoot.children.0.full_path', $child->full_path)
            ->where('navRoot.children.0.href', route('admin.posts.namespace', $child, false))
            ->where('navRoot.children.0.posts.0.full_path', $post->full_path)
            ->where('navRoot.children.0.posts.0.href', route('admin.posts.show', [$child, $post], false))
        );
});

test('admin post details page builds empty-root navigation without including other top-level trees', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create([
        'slug' => 'docs-root',
        'full_path' => '',
        'name' => 'Docs Root',
    ]);
    PostNamespace::query()
        ->whereKey($root->id)
        ->update(['full_path' => '']);
    $root->refresh();
    $child = PostNamespace::factory()->create([
        'parent_id' => $root->id,
        'slug' => 'laravel',
        'full_path' => 'laravel',
        'name' => 'Laravel',
    ]);
    $grandchild = PostNamespace::factory()->create([
        'parent_id' => $child->id,
        'slug' => 'routing',
        'full_path' => 'laravel/routing',
        'name' => 'Routing',
    ]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $grandchild->id,
        'slug' => 'controllers',
        'full_path' => 'laravel/routing/controllers',
        'title' => 'Controllers',
    ]);
    $foreignRoot = PostNamespace::factory()->create([
        'slug' => 'other-root',
        'full_path' => 'other-root',
        'name' => 'Other Root',
    ]);
    $foreignChild = PostNamespace::factory()->create([
        'parent_id' => $foreignRoot->id,
        'slug' => 'ignored-child',
        'full_path' => 'other-root/ignored-child',
        'name' => 'Ignored Child',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $foreignChild->id,
        'slug' => 'ignored-post',
        'full_path' => 'other-root/ignored-child/ignored-post',
        'title' => 'Ignored Post',
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$grandchild, $post]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/show')
            ->where('navRoot.full_path', '')
            ->where('navRoot.href', route('admin.posts.namespace', $root, false))
            ->where('navRoot.children', [
                [
                    'name' => 'Laravel',
                    'full_path' => 'laravel',
                    'href' => route('admin.posts.namespace', $child, false),
                    'children' => [
                        [
                            'name' => 'Routing',
                            'full_path' => 'laravel/routing',
                            'href' => route('admin.posts.namespace', $grandchild, false),
                            'children' => [],
                            'posts' => [
                                [
                                    'title' => 'Controllers',
                                    'full_path' => 'laravel/routing/controllers',
                                    'href' => route('admin.posts.show', [$grandchild, $post], false),
                                ],
                            ],
                        ],
                    ],
                    'posts' => [],
                ],
            ])
        );
});

test('admin post details page does not increment page views', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'page_views' => 12,
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$namespace, $post]))
        ->assertOk();

    expect($post->fresh()->page_views)->toBe(12);
});

test('post details are scoped to their namespace', function () {
    $user = User::factory()->create();
    $correctNamespace = PostNamespace::factory()->create();
    $wrongNamespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $correctNamespace->id,
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$wrongNamespace, $post]))
        ->assertNotFound();
});

test('authenticated users can update a post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id, 'slug' => 'old-slug']);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'New Title',
            'slug' => 'new-slug',
            'content' => 'Updated content.',
            'published_at' => null,
            'reference_title' => 'Updated Reference',
            'reference_url' => 'https://example.com/updated-reference',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.posts.edit', [$namespace, 'new-slug']));

    $post->refresh();
    expect($post->title)->toBe('New Title');
    expect($post->slug)->toBe('new-slug');
    expect($post->published_at)->not->toBeNull();
    expect($post->reference_title)->toBe('Updated Reference');
    expect($post->reference_url)->toBe('https://example.com/updated-reference');
});

test('updating a post allows keeping the same slug', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id, 'slug' => 'my-slug']);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'my-slug',
            'content' => 'Updated content.',
        ])
        ->assertRedirect(route('admin.posts.edit', [$namespace, 'my-slug']));

    expect($post->fresh()->slug)->toBe('my-slug');
});

test('updating a post redirects back to the requested heading fragment', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-slug',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'my-slug',
            'content' => 'Updated content.',
            'return_heading' => 'my-slug-section-title',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.posts.edit', [$namespace, 'my-slug']).'#my-slug-section-title');
});

test('updating a post returns to the admin show page when requested', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-slug',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'my-slug',
            'content' => 'Updated content.',
            'return_heading' => 'my-slug-設定',
            'return_to' => route('admin.posts.show', [$namespace, $post], false),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.posts.show', [$namespace, 'my-slug'], false).'#my-slug-%E8%A8%AD%E5%AE%9A');
});

test('updating a post returns to the updated admin show page when the slug changes', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-slug',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'updated-slug',
            'content' => 'Updated content.',
            'return_heading' => 'updated-slug-設定',
            'return_to' => route('admin.posts.show', [$namespace, $post], false),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.posts.show', [$namespace, 'updated-slug'], false).'#updated-slug-%E8%A8%AD%E5%AE%9A');
});

test('updating a post percent-encodes unicode heading fragments in redirects', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-slug',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'my-slug',
            'content' => 'Updated content.',
            'return_heading' => 'my-slug-設定',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.posts.edit', [$namespace, 'my-slug']).'#my-slug-%E8%A8%AD%E5%AE%9A');
});

test('updating a post redirects back to the updated canonical page', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guides', 'full_path' => 'guides']);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-slug',
        'full_path' => 'guides/my-slug',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'updated-slug',
            'content' => 'Updated content.',
            'return_heading' => 'updated-slug-section-title',
            'return_to' => '/guides/my-slug',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/guides/updated-slug#updated-slug-section-title');

    expect($post->fresh()->slug)->toBe('updated-slug');
    expect($post->fresh()->full_path)->toBe('guides/updated-slug');
});

test('updating a post preserves unicode heading fragments on canonical redirects', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guides', 'full_path' => 'guides']);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-slug',
        'full_path' => 'guides/my-slug',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'updated-slug',
            'content' => 'Updated content.',
            'return_heading' => 'updated-slug-設定',
            'return_to' => '/guides/my-slug',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect('/guides/updated-slug#updated-slug-%E8%A8%AD%E5%AE%9A');
});

test('updating a post ignores unsafe return paths', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-slug',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'my-slug',
            'content' => 'Updated content.',
            'return_to' => 'https://example.com/phish',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('admin.posts.edit', [$namespace, 'my-slug']));
});

test('updating a post rejects a slug used by a child namespace in the same namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guide']);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'draft',
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'markdown',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Markdown',
            'slug' => 'markdown',
            'content' => 'Updated content.',
        ])
        ->assertSessionHasErrors('slug');
});

test('authenticated users can delete a post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);

    $this->actingAs($user)
        ->delete(route('admin.posts.destroy', [$namespace, $post]))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('inertia.flash_data.toast', [
            'type' => 'success',
            'message' => 'Post deleted.',
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace));

    expect($post->fresh())->toBeNull();
});

test('authenticated users can bulk delete posts from a namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $firstPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
    ]);
    $secondPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
    ]);
    $thirdPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
    ]);

    $this->actingAs($user)
        ->post(route('admin.posts.destroyMany', $namespace), [
            'ids' => [$firstPost->id, $thirdPost->id],
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('inertia.flash_data.toast', [
            'type' => 'success',
            'message' => 'Selected posts deleted.',
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace));

    expect($firstPost->fresh())->toBeNull()
        ->and($thirdPost->fresh())->toBeNull()
        ->and($secondPost->fresh())->not->toBeNull();
});

test('authenticated users can upload an image to a post', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);
    $image = UploadedFile::fake()->image('photo.jpg');

    $this->actingAs($user)
        ->post(route('admin.posts.uploadImage', [$namespace, $post]), ['image' => $image])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('imageUrl', "/images/posts/{$post->id}/{$image->hashName()}")
        ->assertRedirect(route('admin.posts.edit', [$namespace, $post]));

    Storage::disk('public')->assertExists("posts/{$post->id}/{$image->hashName()}");
});

test('guests cannot upload images', function () {
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->create(['namespace_id' => $namespace->id]);

    $this->post(route('admin.posts.uploadImage', [$namespace, $post]), [])
        ->assertRedirect(route('login'));
});

test('image upload rejects non-image files', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);

    $this->actingAs($user)
        ->post(route('admin.posts.uploadImage', [$namespace, $post]), [
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors('image');
});

test('authenticated users can upload an image during post creation', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $image = UploadedFile::fake()->image('photo.jpg');

    $this->actingAs($user)
        ->post(route('admin.posts.uploadNamespaceImage', $namespace), ['image' => $image])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('imageUrl', "/images/posts/{$namespace->full_path}/{$image->hashName()}")
        ->assertRedirect(route('admin.posts.create', $namespace));

    Storage::disk('public')->assertExists("posts/{$namespace->full_path}/{$image->hashName()}");
});

test('storing a post syncs tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Tagged Post',
            'slug' => 'tagged-post',
            'content' => 'Some content',
            'tags' => ['php', 'laravel'],
        ])
        ->assertSessionHasNoErrors();

    $post = Post::query()->where('slug', 'tagged-post')->firstOrFail();

    expect($post->tags->pluck('name')->sort()->values()->all())->toBe(['laravel', 'php']);
});

test('storing a post without tags succeeds', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'No Tags Post',
            'slug' => 'no-tags-post',
            'content' => 'Some content',
        ])
        ->assertSessionHasNoErrors();

    $post = Post::query()->where('slug', 'no-tags-post')->firstOrFail();

    expect($post->tags)->toBeEmpty();
});

test('storing a post rejects tags with invalid characters', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Invalid Tags',
            'slug' => 'invalid-tags',
            'content' => 'Some content',
            'tags' => ['UPPERCASE', '--bad'],
        ])
        ->assertSessionHasErrors(['tags.0', 'tags.1']);
});

test('storing a post rejects more than 20 tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Too Many Tags',
            'slug' => 'too-many-tags',
            'content' => 'Some content',
            'tags' => array_map(fn ($i) => "tag-{$i}", range(1, 21)),
        ])
        ->assertSessionHasErrors('tags');
});

test('tags are shared between posts using firstOrCreate', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Post One',
            'slug' => 'post-one',
            'content' => 'Content',
            'tags' => ['shared-tag'],
        ])
        ->assertSessionHasNoErrors();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Post Two',
            'slug' => 'post-two',
            'content' => 'Content',
            'tags' => ['shared-tag'],
        ])
        ->assertSessionHasNoErrors();

    expect(Tag::where('name', 'shared-tag')->count())->toBe(1);
});

test('updating a post syncs tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);
    $existing = Tag::firstOrCreate(['name' => 'old-tag']);
    $post->tags()->attach($existing);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => $post->title,
            'slug' => $post->slug,
            'content' => $post->content,
            'tags' => ['new-tag'],
        ])
        ->assertSessionHasNoErrors();

    expect($post->fresh()->tags->pluck('name')->all())->toBe(['new-tag']);
    expect(Tag::where('name', 'old-tag')->exists())->toBeTrue();
});

test('updating a post with empty tags removes all tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);
    $tag = Tag::firstOrCreate(['name' => 'some-tag']);
    $post->tags()->attach($tag);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => $post->title,
            'slug' => $post->slug,
            'content' => $post->content,
            'tags' => [],
        ])
        ->assertSessionHasNoErrors();

    expect($post->fresh()->tags)->toBeEmpty();
});

test('namespace post list includes tags for each post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);
    $tag = Tag::firstOrCreate(['name' => 'php']);
    $post->tags()->attach($tag);

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $namespace))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/namespace')
            ->where('posts.0.tags.0.name', 'php')
        );
});

test('edit form includes post tags and available tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);
    $phpTag = Tag::firstOrCreate(['name' => 'php']);
    Tag::firstOrCreate(['name' => 'laravel']);
    $post->tags()->attach($phpTag);

    $this->actingAs($user)
        ->get(route('admin.posts.edit', [$namespace, $post]))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/edit')
            ->where('post.tags', ['php'])
            ->where('availableTags', ['laravel', 'php'])
        );
});

test('namespace backup includes post tags in frontmatter', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-backup-tags',
        'name' => 'Guides',
    ]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'tagged-post',
        'title' => 'Tagged Post',
        'content' => 'Content here.',
    ]);
    $post->tags()->attach([
        Tag::firstOrCreate(['name' => 'php'])->id,
        Tag::firstOrCreate(['name' => 'laravel'])->id,
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    try {
        $this->actingAs($user)
            ->post(route('admin.posts.backups.store', $namespace))
            ->assertSessionHasNoErrors();

        $zipFiles = File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip');
        expect($zipFiles)->toHaveCount(1);

        $zip = new ZipArchive;
        $zip->open($zipFiles[0]);
        $content = $zip->getFromName('tagged-post.md');
        $zip->close();

        expect($content)
            ->toContain('php')
            ->toContain('laravel');
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('restoring a backup syncs post tags', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-restore-tags',
        'name' => 'Guides',
    ]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-post',
        'title' => 'My Post',
        'content' => 'Old content',
    ]);
    $post->tags()->attach(Tag::firstOrCreate(['name' => 'old-tag'])->id);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $zipPath = $backupDirectory.'/'.$backupPrefix.'-20260424-120000.zip';
    createAdminNamespaceBackupZip($zipPath, [
        'slug' => 'guides-restore-tags',
        'name' => 'Guides',
        'full_path' => 'guides-restore-tags',
        'posts' => [
            [
                'title' => 'My Post',
                'slug' => 'my-post',
                'full_path' => 'guides-restore-tags/my-post',
                'content' => 'Restored content',
                'tags' => ['php', 'laravel'],
            ],
        ],
    ]);

    try {
        $this->actingAs($user)
            ->post(route('admin.posts.backups.restore', [
                'namespace' => $namespace,
                'backup' => basename($zipPath),
            ]), ['confirmation' => 'Guides'])
            ->assertSessionHasNoErrors();

        $post->refresh();
        $tagNames = $post->tags->pluck('name')->sort()->values()->all();
        expect($tagNames)->toBe(['laravel', 'php']);
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});

test('restoring a backup clears tags when frontmatter has no tags field', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides-restore-notags',
        'name' => 'Guides',
    ]);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'my-post',
        'title' => 'My Post',
        'content' => 'Old content',
    ]);
    $post->tags()->attach(Tag::firstOrCreate(['name' => 'old-tag'])->id);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPrefix = NamespaceBackupArchive::currentPrefix($namespace);
    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));

    $zipPath = $backupDirectory.'/'.$backupPrefix.'-20260424-130000.zip';
    createAdminNamespaceBackupZip($zipPath, [
        'slug' => 'guides-restore-notags',
        'name' => 'Guides',
        'full_path' => 'guides-restore-notags',
        'posts' => [
            [
                'title' => 'My Post',
                'slug' => 'my-post',
                'full_path' => 'guides-restore-notags/my-post',
                'content' => 'Restored content',
            ],
        ],
    ]);

    try {
        $this->actingAs($user)
            ->post(route('admin.posts.backups.restore', [
                'namespace' => $namespace,
                'backup' => basename($zipPath),
            ]), ['confirmation' => 'Guides'])
            ->assertSessionHasNoErrors();

        expect($post->fresh()->tags)->toBeEmpty();
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$backupPrefix.'-*.zip'));
    }
});
