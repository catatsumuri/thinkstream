<?php

use App\Models\PostNamespace;
use App\Models\User;
use App\Support\NamespaceBackupArchive;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;

uses(RefreshDatabase::class);

function createAdminBackupsBrowserZip(string $zipPath, array $tree): void
{
    $zip = new ZipArchive;

    expect($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE))->toBeTrue();

    $zip->addFromString('_namespace.yaml', Yaml::dump([
        'name' => $tree['name'],
        'slug' => $tree['slug'],
        'full_path' => $tree['full_path'] ?? $tree['slug'],
        'description' => $tree['description'] ?? null,
        'is_published' => $tree['is_published'] ?? true,
        'post_order' => [],
    ], 4));

    $zip->close();
}

test('admin backups page separates create and restore actions into tabs', function () {
    $user = User::factory()->create([
        'email' => 'test@example.com',
    ]);

    PostNamespace::factory()->create([
        'slug' => 'syntax',
        'full_path' => 'syntax',
        'name' => 'Syntax',
    ]);

    $backupDirectory = NamespaceBackupArchive::directory();
    $backupPath = $backupDirectory.'/syntax-20260426-010203.zip';

    File::ensureDirectoryExists($backupDirectory);
    File::delete([$backupPath]);

    createAdminBackupsBrowserZip($backupPath, [
        'name' => 'Syntax',
        'slug' => 'syntax',
        'full_path' => 'syntax',
    ]);

    try {
        $this->actingAs($user);

        $page = visit(route('admin.backups.index', absolute: false))->resize(1440, 900);

        $page
            ->assertNoJavaScriptErrors()
            ->assertPresent('[data-test="admin-backups-tab-create"]')
            ->assertPresent('[data-test="admin-backups-tab-restore"]')
            ->assertPresent('[data-test="admin-backups-panel-create"]')
            ->assertMissing('[data-test="admin-backups-panel-restore"]')
            ->assertSee('Create Backup');

        $page->click('[data-test="admin-backups-tab-restore"]')->wait(0.2);

        $page
            ->assertPresent('[data-test="admin-backups-panel-restore"]')
            ->assertSee('Backup Files')
            ->assertSee(basename($backupPath))
            ->assertMissing('[data-test="admin-backups-panel-create"]');
    } finally {
        File::delete([$backupPath]);
    }
});
