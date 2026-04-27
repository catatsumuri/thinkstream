<?php

namespace App\Support;

use App\Models\PostNamespace;

class NamespaceBackupArchive
{
    public const BACKUP_MANIFEST = '_backup.yaml';

    public const NAMESPACE_MANIFEST = '_namespace.yaml';

    public static function directory(): string
    {
        return rtrim((string) config('thinkstream.backup.directory', storage_path('app/private/backups')), '/');
    }

    public static function defaultPath(PostNamespace $namespace, ?string $timestamp = null): string
    {
        $timestamp ??= now()->format('Ymd-His');

        return self::directory().'/'.self::currentPrefix($namespace).'-'.$timestamp.'.zip';
    }

    public static function currentPrefix(PostNamespace $namespace): string
    {
        $path = trim($namespace->full_path, '/');

        if ($path === '') {
            return 'namespace-'.$namespace->id;
        }

        return str_replace('/', '--', $path);
    }

    /**
     * @return array<int, string>
     */
    public static function legacyLookupPatterns(PostNamespace $namespace): array
    {
        $path = trim($namespace->full_path, '/');

        if ($path === '') {
            return [];
        }

        return [
            'namespace-*-'.str_replace('/', '--', $path),
        ];
    }
}
