<?php

namespace App\Support;

use App\Models\PostNamespace;

class NamespaceBackupArchive
{
    public static function directory(): string
    {
        return storage_path('app/private/backups');
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
