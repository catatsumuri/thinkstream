<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PostNamespace;
use App\Support\NamespaceBackupIndex;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class BackupController extends Controller
{
    public function index(NamespaceBackupIndex $backupIndex): Response
    {
        $backups = collect($backupIndex->allFiles());
        $backupCountsByNamespaceId = $backups
            ->pluck('namespace')
            ->filter()
            ->countBy('id');

        $namespaces = PostNamespace::query()
            ->orderByRaw('sort_order IS NULL, sort_order ASC, name ASC')
            ->get(['id', 'slug', 'full_path', 'name']);

        return Inertia::render('admin/backups/index', [
            'namespaces' => $namespaces->map(fn (PostNamespace $namespace): array => [
                'id' => $namespace->id,
                'name' => $namespace->name,
                'slug' => $namespace->slug,
                'full_path' => $namespace->full_path,
                'backup_count' => $backupCountsByNamespaceId->get($namespace->id, 0),
                'create_backup_url' => route('admin.posts.backups.store', $namespace, absolute: false),
                'management_url' => route('admin.posts.backups', $namespace, absolute: false),
                'namespace_url' => route('admin.posts.namespace', $namespace, absolute: false),
            ])->values()->all(),
            'create_backups_url' => route('admin.backups.storeMany', absolute: false),
            'delete_backups_url' => route('admin.backups.destroyMany', absolute: false),
            'restore_backups_url' => route('admin.backups.restoreMany', absolute: false),
            'backups' => $backups
                ->map(fn (array $backup): array => [
                    'key' => $backup['filename'],
                    'filename' => $backup['filename'],
                    'created_at' => $backup['created_at'],
                    'size_bytes' => $backup['size_bytes'],
                    'size_human' => $backup['size_human'],
                    'description' => $backup['archive']['description'],
                    'label' => $backup['archive']['name']
                        ?? $backup['archive']['full_path']
                        ?? $backup['filename'],
                    'namespace' => [
                        'id' => $backup['namespace']?->id,
                        'name' => $backup['archive']['name'] ?? $backup['namespace']?->name,
                        'slug' => $backup['archive']['slug'] ?? $backup['namespace']?->slug,
                        'full_path' => $backup['archive']['full_path'] ?? $backup['namespace']?->full_path,
                        'management_url' => $backup['namespace'] !== null
                            ? route('admin.posts.backups', $backup['namespace'], absolute: false)
                            : null,
                        'namespace_url' => $backup['namespace'] !== null
                            ? route('admin.posts.namespace', $backup['namespace'], absolute: false)
                            : null,
                    ],
                    'download_url' => route('admin.backups.download', [
                        'backup' => $backup['filename'],
                    ], absolute: false),
                    'restore_url' => route('admin.backups.restore', [
                        'backup' => $backup['filename'],
                    ], absolute: false),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function storeMany(Request $request): RedirectResponse
    {
        $availableIds = PostNamespace::pluck('id')->all();

        $data = $request->validate([
            'namespace_ids' => ['required', 'array', 'min:1'],
            'namespace_ids.*' => ['integer', 'distinct:strict', Rule::in($availableIds)],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $description = trim((string) ($data['description'] ?? ''));

        foreach ($data['namespace_ids'] as $namespaceId) {
            $arguments = ['namespace' => $namespaceId];

            if ($description !== '') {
                $arguments['--description'] = $description;
            }

            $exitCode = Artisan::call('namespace:backup', $arguments);

            if ($exitCode !== 0) {
                return back()->withErrors([
                    'backup' => 'Failed to create backup for one or more namespaces.',
                ]);
            }
        }

        $count = count($data['namespace_ids']);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} backup".($count === 1 ? '' : 's').' created.']);

        return to_route('admin.backups.index');
    }

    public function destroyMany(Request $request, NamespaceBackupIndex $backupIndex): RedirectResponse
    {
        $availableBackups = collect($backupIndex->allFiles())
            ->keyBy('filename');

        $data = $request->validate([
            'keys' => ['required', 'array', 'min:1'],
            'keys.*' => ['string', 'distinct:strict', Rule::in($availableBackups->keys()->all())],
        ]);

        foreach ($data['keys'] as $key) {
            $backup = $availableBackups->get($key);

            if (is_array($backup) && File::exists($backup['path'])) {
                File::delete($backup['path']);
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Selected backups deleted.']);

        return to_route('admin.backups.index');
    }

    public function restoreMany(Request $request, NamespaceBackupIndex $backupIndex): RedirectResponse
    {
        $availableBackups = collect($backupIndex->allFiles())
            ->keyBy('filename');

        $data = $request->validate([
            'keys' => ['required', 'array', 'min:1'],
            'keys.*' => ['string', 'distinct:strict', Rule::in($availableBackups->keys()->all())],
        ]);

        $selectedBackups = collect($data['keys'])
            ->map(fn (string $key): ?array => $availableBackups->get($key))
            ->filter(fn (?array $backup): bool => is_array($backup))
            ->values();

        $namespaceKeys = $selectedBackups
            ->map(fn (array $backup): string => $backup['archive']['full_path']
                ?? $backup['archive']['slug']
                ?? $backup['filename']);

        if ($namespaceKeys->count() !== $namespaceKeys->unique()->count()) {
            throw ValidationException::withMessages([
                'keys' => 'Cannot restore multiple backups for the same namespace at once.',
            ]);
        }

        foreach ($selectedBackups as $backup) {
            $exitCode = Artisan::call('namespace:restore', [
                'path' => $backup['path'],
            ]);

            if ($exitCode !== 0) {
                return back()->withErrors([
                    'backup' => 'Failed to restore one or more selected backups.',
                ]);
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Selected backups restored.']);

        return to_route('admin.backups.index');
    }

    public function download(string $backup, NamespaceBackupIndex $backupIndex): BinaryFileResponse
    {
        $backupRecord = $backupIndex->fileByFilename($backup);

        abort_unless($backupRecord !== null && File::exists($backupRecord['path']), 404);

        return response()->download($backupRecord['path'], $backupRecord['filename']);
    }

    public function restore(
        Request $request,
        string $backup,
        NamespaceBackupIndex $backupIndex
    ): RedirectResponse {
        $backupRecord = $backupIndex->fileByFilename($backup);

        abort_unless($backupRecord !== null, 404);

        $confirmationTarget = $backupRecord['archive']['name']
            ?? $backupRecord['archive']['full_path']
            ?? $backupRecord['filename'];

        $request->validate([
            'confirmation' => ['required', 'string', Rule::in([$confirmationTarget])],
        ]);

        $exitCode = Artisan::call('namespace:restore', [
            'path' => $backupRecord['path'],
        ]);

        if ($exitCode !== 0) {
            return back()->withErrors([
                'backup' => 'Failed to restore the selected backup.',
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Backup restored.']);

        return to_route('admin.backups.index');
    }
}
