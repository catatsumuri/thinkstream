<?php

use App\Models\PostNamespace;
use App\Models\User;
use App\Support\NamespaceBackupArchive;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;

uses(RefreshDatabase::class);

function createBackupControllerNamespaceBackupZip(string $zipPath, array $tree): void
{
    $zip = new ZipArchive;

    expect($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE))->toBeTrue();

    if (array_key_exists('backup_description', $tree)) {
        $zip->addFromString('_backup.yaml', Yaml::dump([
            'description' => $tree['backup_description'],
        ], 4));
    }

    $zip->addFromString('_namespace.yaml', Yaml::dump([
        'name' => $tree['name'],
        'slug' => $tree['slug'],
        'full_path' => $tree['full_path'] ?? $tree['slug'],
        'description' => $tree['description'] ?? null,
        'is_published' => $tree['is_published'] ?? true,
        'post_order' => $tree['post_order'] ?? [],
    ], 4));

    foreach ($tree['posts'] ?? [] as $post) {
        $frontmatter = [
            'title' => $post['title'],
            'slug' => $post['slug'],
            'full_path' => $post['full_path'] ?? (($tree['full_path'] ?? $tree['slug']).'/'.$post['slug']),
            'is_draft' => $post['is_draft'] ?? false,
            'published_at' => $post['published_at'] ?? now()->toIso8601String(),
        ];

        $zip->addFromString(
            $post['slug'].'.md',
            "---\n".Yaml::dump($frontmatter)."---\n\n".rtrim($post['content'] ?? '')."\n"
        );
    }

    $zip->close();
}

function withinIsolatedAdminBackupDirectory(callable $callback): mixed
{
    $backupDirectory = NamespaceBackupArchive::directory();
    $stashedBackupDirectory = storage_path('framework/testing/backups-'.str()->uuid());
    $hadExistingBackups = File::isDirectory($backupDirectory);

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

test('guests are redirected from the backups index', function () {
    $this->get(route('admin.backups.index'))->assertRedirect(route('login'));
});

test('authenticated users can view the backups index', function () {
    withinIsolatedAdminBackupDirectory(function (string $backupDirectory): void {
        $user = User::factory()->create();
        $alpha = PostNamespace::factory()->create([
            'slug' => 'alpha',
            'full_path' => 'alpha',
            'name' => 'Alpha',
            'sort_order' => 0,
        ]);
        $beta = PostNamespace::factory()->create([
            'slug' => 'beta',
            'full_path' => 'beta',
            'name' => 'Beta',
            'sort_order' => 1,
        ]);

        $alphaPrefix = NamespaceBackupArchive::currentPrefix($alpha);
        $betaPrefix = NamespaceBackupArchive::currentPrefix($beta);
        $olderBackup = $backupDirectory.'/'.$alphaPrefix.'-20260421-010203.zip';
        $latestBackup = $backupDirectory.'/'.$betaPrefix.'-20260421-040506.zip';

        createBackupControllerNamespaceBackupZip($olderBackup, [
            'name' => 'Alpha',
            'slug' => 'alpha',
            'full_path' => 'alpha',
            'backup_description' => 'Alpha before import',
        ]);
        touch($olderBackup, now()->addYears(10)->subHour()->timestamp);
        createBackupControllerNamespaceBackupZip($latestBackup, [
            'name' => 'Beta',
            'slug' => 'beta',
            'full_path' => 'beta',
            'backup_description' => 'Beta release snapshot',
        ]);
        touch($latestBackup, now()->addYears(10)->timestamp);

        $this->actingAs($user)
            ->get(route('admin.backups.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/backups/index')
                ->has('namespaces', 2)
                ->where('namespaces.0.id', $alpha->id)
                ->where('namespaces.0.backup_count', 1)
                ->where('namespaces.0.create_backup_url', route('admin.posts.backups.store', $alpha, false))
                ->where('namespaces.0.management_url', route('admin.posts.backups', $alpha, false))
                ->where('namespaces.1.id', $beta->id)
                ->where('namespaces.1.backup_count', 1)
                ->has('backups', 2)
                ->where('backups.0.filename', basename($latestBackup))
                ->where('backups.0.label', 'Beta')
                ->where('backups.0.description', 'Beta release snapshot')
                ->where('backups.0.namespace.id', $beta->id)
                ->where('backups.0.download_url', route('admin.backups.download', [
                    'backup' => basename($latestBackup),
                ], false))
                ->where('backups.1.filename', basename($olderBackup))
                ->where('backups.1.label', 'Alpha')
                ->where('backups.1.description', 'Alpha before import')
                ->where('backups.1.namespace.id', $alpha->id)
                ->where('delete_backups_url', route('admin.backups.destroyMany', absolute: false))
                ->where('create_backups_url', route('admin.backups.storeMany', absolute: false))
            );
    });
});

test('authenticated users can delete selected backups from the backups index', function () {
    $user = User::factory()->create();
    $alpha = PostNamespace::factory()->create([
        'slug' => 'alpha-delete',
        'full_path' => 'alpha-delete',
        'name' => 'Alpha Delete',
    ]);
    $beta = PostNamespace::factory()->create([
        'slug' => 'beta-delete',
        'full_path' => 'beta-delete',
        'name' => 'Beta Delete',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $alphaPrefix = NamespaceBackupArchive::currentPrefix($alpha);
    $betaPrefix = NamespaceBackupArchive::currentPrefix($beta);

    File::ensureDirectoryExists($backupDirectory);
    File::delete([
        ...File::glob($backupDirectory.'/'.$alphaPrefix.'-*.zip'),
        ...File::glob($backupDirectory.'/'.$betaPrefix.'-*.zip'),
    ]);

    $firstBackup = $backupDirectory.'/'.$alphaPrefix.'-20260421-010203.zip';
    $secondBackup = $backupDirectory.'/'.$betaPrefix.'-20260421-040506.zip';
    $thirdBackup = $backupDirectory.'/'.$betaPrefix.'-20260421-070809.zip';

    File::put($firstBackup, 'alpha-backup');
    File::put($secondBackup, 'beta-backup-1');
    File::put($thirdBackup, 'beta-backup-2');

    try {
        $this->actingAs($user)
            ->post(route('admin.backups.destroyMany'), [
                'keys' => [
                    basename($firstBackup),
                    basename($thirdBackup),
                ],
            ])
            ->assertRedirect(route('admin.backups.index'))
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'success',
                'message' => 'Selected backups deleted.',
            ]);

        expect(File::exists($firstBackup))->toBeFalse()
            ->and(File::exists($thirdBackup))->toBeFalse()
            ->and(File::exists($secondBackup))->toBeTrue();
    } finally {
        File::delete([
            ...File::glob($backupDirectory.'/'.$alphaPrefix.'-*.zip'),
            ...File::glob($backupDirectory.'/'.$betaPrefix.'-*.zip'),
        ]);
    }
});

test('authenticated users can restore selected backups from the backups index', function () {
    $user = User::factory()->create();

    $alpha = PostNamespace::factory()->create([
        'slug' => 'alpha-restore',
        'full_path' => 'alpha-restore',
        'name' => 'Alpha Restore',
        'description' => 'Old alpha description',
    ]);
    $beta = PostNamespace::factory()->create([
        'slug' => 'beta-restore',
        'full_path' => 'beta-restore',
        'name' => 'Beta Restore',
        'description' => 'Old beta description',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $alphaPath = $backupDirectory.'/alpha-restore-20260421-010203.zip';
    $betaPath = $backupDirectory.'/beta-restore-20260421-040506.zip';

    File::ensureDirectoryExists($backupDirectory);
    File::delete([$alphaPath, $betaPath]);

    createBackupControllerNamespaceBackupZip($alphaPath, [
        'name' => 'Alpha Restore',
        'slug' => 'alpha-restore',
        'full_path' => 'alpha-restore',
        'description' => 'Restored alpha description',
    ]);
    createBackupControllerNamespaceBackupZip($betaPath, [
        'name' => 'Beta Restore',
        'slug' => 'beta-restore',
        'full_path' => 'beta-restore',
        'description' => 'Restored beta description',
    ]);

    try {
        $this->actingAs($user)
            ->post(route('admin.backups.restoreMany'), [
                'keys' => [
                    basename($alphaPath),
                    basename($betaPath),
                ],
            ])
            ->assertRedirect(route('admin.backups.index'))
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'success',
                'message' => 'Selected backups restored.',
            ]);

        expect($alpha->fresh()->description)->toBe('Restored alpha description')
            ->and($beta->fresh()->description)->toBe('Restored beta description');
    } finally {
        File::delete([$alphaPath, $betaPath]);
    }
});

test('guests are redirected from the bulk create endpoint', function () {
    $this->post(route('admin.backups.storeMany'))->assertRedirect(route('login'));
});

test('authenticated users can create backups for multiple namespaces', function () {
    $user = User::factory()->create();
    $alpha = PostNamespace::factory()->create([
        'slug' => 'alpha-bulk-create',
        'full_path' => 'alpha-bulk-create',
        'name' => 'Alpha Bulk Create',
    ]);
    $beta = PostNamespace::factory()->create([
        'slug' => 'beta-bulk-create',
        'full_path' => 'beta-bulk-create',
        'name' => 'Beta Bulk Create',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $alphaPrefix = NamespaceBackupArchive::currentPrefix($alpha);
    $betaPrefix = NamespaceBackupArchive::currentPrefix($beta);

    File::ensureDirectoryExists($backupDirectory);
    File::delete([
        ...File::glob($backupDirectory.'/'.$alphaPrefix.'-*.zip'),
        ...File::glob($backupDirectory.'/'.$betaPrefix.'-*.zip'),
    ]);

    try {
        $this->actingAs($user)
            ->post(route('admin.backups.storeMany'), [
                'namespace_ids' => [$alpha->id, $beta->id],
            ])
            ->assertRedirect(route('admin.backups.index'))
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'success',
                'message' => '2 backups created.',
            ]);

        expect(File::glob($backupDirectory.'/'.$alphaPrefix.'-*.zip'))->toHaveCount(1)
            ->and(File::glob($backupDirectory.'/'.$betaPrefix.'-*.zip'))->toHaveCount(1);
    } finally {
        File::delete([
            ...File::glob($backupDirectory.'/'.$alphaPrefix.'-*.zip'),
            ...File::glob($backupDirectory.'/'.$betaPrefix.'-*.zip'),
        ]);
    }
});

test('authenticated users can create a single backup from the bulk create endpoint', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'single-bulk-create',
        'full_path' => 'single-bulk-create',
        'name' => 'Single Bulk Create',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $prefix = NamespaceBackupArchive::currentPrefix($namespace);

    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$prefix.'-*.zip'));

    try {
        $this->actingAs($user)
            ->post(route('admin.backups.storeMany'), [
                'namespace_ids' => [$namespace->id],
            ])
            ->assertRedirect(route('admin.backups.index'))
            ->assertSessionHas('inertia.flash_data.toast', [
                'type' => 'success',
                'message' => '1 backup created.',
            ]);

        expect(File::glob($backupDirectory.'/'.$prefix.'-*.zip'))->toHaveCount(1);
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$prefix.'-*.zip'));
    }
});

test('bulk create embeds the shared description in each backup archive', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'desc-bulk-create',
        'full_path' => 'desc-bulk-create',
        'name' => 'Desc Bulk Create',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $prefix = NamespaceBackupArchive::currentPrefix($namespace);

    File::ensureDirectoryExists($backupDirectory);
    File::delete(File::glob($backupDirectory.'/'.$prefix.'-*.zip'));

    try {
        $this->actingAs($user)
            ->post(route('admin.backups.storeMany'), [
                'namespace_ids' => [$namespace->id],
                'description' => 'Shared bulk note',
            ])
            ->assertRedirect(route('admin.backups.index'));

        $zips = File::glob($backupDirectory.'/'.$prefix.'-*.zip');
        expect($zips)->toHaveCount(1);

        $zip = new ZipArchive;
        expect($zip->open($zips[0]))->toBeTrue();
        $manifest = $zip->getFromName('_backup.yaml');
        $zip->close();

        expect($manifest)->toContain('Shared bulk note');
    } finally {
        File::delete(File::glob($backupDirectory.'/'.$prefix.'-*.zip'));
    }
});

test('bulk create rejects unknown namespace IDs', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('admin.backups.index'))
        ->post(route('admin.backups.storeMany'), [
            'namespace_ids' => [99999],
        ])
        ->assertSessionHasErrors('namespace_ids.0');
});

test('bulk create requires at least one namespace ID', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('admin.backups.index'))
        ->post(route('admin.backups.storeMany'), [
            'namespace_ids' => [],
        ])
        ->assertSessionHasErrors('namespace_ids');
});

test('bulk restore rejects selecting multiple backups for the same namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'shared-restore',
        'full_path' => 'shared-restore',
        'name' => 'Shared Restore',
        'description' => 'Original description',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $firstPath = $backupDirectory.'/shared-restore-20260421-010203.zip';
    $secondPath = $backupDirectory.'/shared-restore-20260421-040506.zip';

    File::ensureDirectoryExists($backupDirectory);
    File::delete([$firstPath, $secondPath]);

    createBackupControllerNamespaceBackupZip($firstPath, [
        'name' => 'Shared Restore',
        'slug' => 'shared-restore',
        'full_path' => 'shared-restore',
        'description' => 'First restore description',
    ]);
    createBackupControllerNamespaceBackupZip($secondPath, [
        'name' => 'Shared Restore',
        'slug' => 'shared-restore',
        'full_path' => 'shared-restore',
        'description' => 'Second restore description',
    ]);

    try {
        $this->actingAs($user)
            ->from(route('admin.backups.index'))
            ->post(route('admin.backups.restoreMany'), [
                'keys' => [
                    basename($firstPath),
                    basename($secondPath),
                ],
            ])
            ->assertRedirect(route('admin.backups.index'))
            ->assertSessionHasErrors('keys');

        expect($namespace->fresh()->description)->toBe('Original description');
    } finally {
        File::delete([$firstPath, $secondPath]);
    }
});
