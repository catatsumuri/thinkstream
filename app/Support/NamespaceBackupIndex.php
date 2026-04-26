<?php

namespace App\Support;

use App\Models\PostNamespace;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class NamespaceBackupIndex
{
    public function countForNamespace(PostNamespace $namespace): int
    {
        return count($this->filesForNamespace($namespace));
    }

    /**
     * @return array<int, array{
     *     filename: string,
     *     path: string,
     *     created_at: string,
     *     size_bytes: int,
     *     size_human: string,
     *     archive: array{name: string|null, slug: string|null, full_path: string|null, description: string|null}
     * }>
     */
    public function filesForNamespace(PostNamespace $namespace): array
    {
        return collect($this->backupPathsForNamespace($namespace))
            ->map(fn (string $path): array => [
                'filename' => basename($path),
                'path' => $path,
                'created_at' => date(DATE_ATOM, File::lastModified($path)),
                'size_bytes' => File::size($path),
                'size_human' => $this->formatBytes(File::size($path)),
                'archive' => $this->readArchiveMetadata($path),
            ])
            ->all();
    }

    /**
     * @param  Collection<int, PostNamespace>  $namespaces
     * @return array<int, array{
     *     namespace: PostNamespace,
     *     filename: string,
     *     path: string,
     *     created_at: string,
     *     size_bytes: int,
     *     size_human: string,
     *     archive: array{name: string|null, slug: string|null, full_path: string|null, description: string|null}
     * }>
     */
    public function filesForNamespaces(Collection $namespaces): array
    {
        return $namespaces
            ->flatMap(fn (PostNamespace $namespace): array => collect($this->filesForNamespace($namespace))
                ->map(fn (array $file): array => [
                    'namespace' => $namespace,
                    ...$file,
                ])
                ->all())
            ->sortByDesc(fn (array $file): string => $file['created_at'])
            ->values()
            ->all();
    }

    /**
     * @return array{
     *     filename: string,
     *     path: string,
     *     created_at: string,
     *     size_bytes: int,
     *     size_human: string,
     *     archive: array{name: string|null, slug: string|null, full_path: string|null, description: string|null}
     * }|null
     */
    public function fileForNamespace(PostNamespace $namespace, string $filename): ?array
    {
        return collect($this->filesForNamespace($namespace))
            ->first(fn (array $file): bool => $file['filename'] === basename($filename));
    }

    /**
     * @return array<int, array{
     *     filename: string,
     *     path: string,
     *     created_at: string,
     *     size_bytes: int,
     *     size_human: string,
     *     archive: array{name: string|null, slug: string|null, full_path: string|null, description: string|null},
     *     namespace: PostNamespace|null
     * }>
     */
    public function allFiles(): array
    {
        $backupDirectory = NamespaceBackupArchive::directory();

        if (! File::isDirectory($backupDirectory)) {
            return [];
        }

        $backups = collect(File::glob($backupDirectory.'/*.zip') ?: [])
            ->filter(fn (string $path): bool => File::isFile($path))
            ->sortByDesc(fn (string $path): int => File::lastModified($path))
            ->values()
            ->map(function (string $path): array {
                return [
                    'filename' => basename($path),
                    'path' => $path,
                    'created_at' => date(DATE_ATOM, File::lastModified($path)),
                    'size_bytes' => File::size($path),
                    'size_human' => $this->formatBytes(File::size($path)),
                    'archive' => $this->readArchiveMetadata($path),
                ];
            });

        $namespacesByFullPath = PostNamespace::query()
            ->whereIn(
                'full_path',
                $backups
                    ->pluck('archive.full_path')
                    ->filter()
                    ->unique()
                    ->all()
            )
            ->get(['id', 'slug', 'full_path', 'name'])
            ->keyBy('full_path');

        return $backups
            ->map(fn (array $backup): array => [
                ...$backup,
                'namespace' => $backup['archive']['full_path'] !== null
                    ? $namespacesByFullPath->get($backup['archive']['full_path'])
                    : null,
            ])
            ->all();
    }

    /**
     * @return array{
     *     filename: string,
     *     path: string,
     *     created_at: string,
     *     size_bytes: int,
     *     size_human: string,
     *     archive: array{name: string|null, slug: string|null, full_path: string|null, description: string|null},
     *     namespace: PostNamespace|null
     * }|null
     */
    public function fileByFilename(string $filename): ?array
    {
        return collect($this->allFiles())
            ->first(fn (array $file): bool => $file['filename'] === basename($filename));
    }

    /**
     * @return array<int, string>
     */
    private function backupPathsForNamespace(PostNamespace $namespace): array
    {
        $backupDirectory = NamespaceBackupArchive::directory();

        if (! File::isDirectory($backupDirectory)) {
            return [];
        }

        $backupPaths = collect([
            ...(
                File::glob($backupDirectory.'/'.NamespaceBackupArchive::currentPrefix($namespace).'-*.zip')
                ?: []
            ),
            ...collect(NamespaceBackupArchive::legacyLookupPatterns($namespace))
                ->flatMap(fn (string $pattern): array => File::glob($backupDirectory.'/'.$pattern.'-*.zip') ?: [])
                ->all(),
        ]);

        if (PostNamespace::query()->where('slug', $namespace->slug)->count() === 1) {
            $backupPaths = $backupPaths->merge(
                File::glob($backupDirectory.'/'.$namespace->slug.'-*.zip') ?: []
            );
        }

        return $backupPaths
            ->unique()
            ->filter(fn (string $path): bool => File::isFile($path))
            ->sortByDesc(fn (string $path): int => File::lastModified($path))
            ->values()
            ->all();
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }

    /**
     * @return array{name: string|null, slug: string|null, full_path: string|null, description: string|null}
     */
    private function readArchiveMetadata(string $path): array
    {
        $zip = new ZipArchive;

        if ($zip->open($path) !== true) {
            return [
                'name' => null,
                'slug' => null,
                'full_path' => null,
                'description' => null,
            ];
        }

        $namespaceYaml = $zip->getFromName(NamespaceBackupArchive::NAMESPACE_MANIFEST);
        $backupYaml = $zip->getFromName(NamespaceBackupArchive::BACKUP_MANIFEST);
        $zip->close();

        if (! is_string($namespaceYaml) || $namespaceYaml === '') {
            return [
                'name' => null,
                'slug' => null,
                'full_path' => null,
                'description' => null,
            ];
        }

        $namespaceData = Yaml::parse($namespaceYaml);
        $backupData = is_string($backupYaml) && $backupYaml !== ''
            ? Yaml::parse($backupYaml)
            : null;

        return [
            'name' => is_array($namespaceData) ? ($namespaceData['name'] ?? null) : null,
            'slug' => is_array($namespaceData) ? ($namespaceData['slug'] ?? null) : null,
            'full_path' => is_array($namespaceData) ? ($namespaceData['full_path'] ?? null) : null,
            'description' => is_array($backupData) ? ($backupData['description'] ?? null) : null,
        ];
    }
}
