<?php

namespace App\Support;

use App\Models\Post;
use App\Models\PostNamespace;

class ContentPathConflict
{
    public static function findNamespaceConflict(
        ?int $parentId,
        string $slug,
        ?PostNamespace $namespace = null,
    ): ?string {
        $futureRootPath = self::buildNamespacePath($parentId, $slug);

        if ($namespace === null) {
            return self::findConflict([$futureRootPath]);
        }

        $affectedNamespaces = PostNamespace::query()
            ->whereKey($namespace->id)
            ->orWhere('full_path', 'like', $namespace->full_path.'/%')
            ->get(['id', 'full_path']);

        $affectedPosts = Post::query()
            ->where('full_path', 'like', $namespace->full_path.'/%')
            ->get(['id', 'full_path']);

        $futurePaths = $affectedNamespaces
            ->pluck('full_path')
            ->map(fn (string $path): string => self::replacePathPrefix($path, $namespace->full_path, $futureRootPath))
            ->merge(
                $affectedPosts
                    ->pluck('full_path')
                    ->map(fn (string $path): string => self::replacePathPrefix($path, $namespace->full_path, $futureRootPath)),
            )
            ->values()
            ->all();

        return self::findConflict(
            $futurePaths,
            $affectedNamespaces->pluck('id')->all(),
            $affectedPosts->pluck('id')->all(),
        );
    }

    public static function findPostConflict(
        int $namespaceId,
        string $slug,
        ?Post $post = null,
    ): ?string {
        $futurePath = self::buildPostPath($namespaceId, $slug);

        return self::findConflict(
            [$futurePath],
            [],
            $post ? [$post->id] : [],
        );
    }

    private static function buildNamespacePath(?int $parentId, string $slug): string
    {
        $parentPath = $parentId === null
            ? null
            : PostNamespace::query()->whereKey($parentId)->value('full_path');

        return self::joinPath($parentPath, $slug);
    }

    private static function buildPostPath(int $namespaceId, string $slug): string
    {
        $namespacePath = PostNamespace::query()->whereKey($namespaceId)->value('full_path');

        return self::joinPath($namespacePath, $slug);
    }

    /**
     * @param  array<int, string>  $paths
     * @param  array<int, int>  $ignoredNamespaceIds
     * @param  array<int, int>  $ignoredPostIds
     */
    private static function findConflict(
        array $paths,
        array $ignoredNamespaceIds = [],
        array $ignoredPostIds = [],
    ): ?string {
        $namespaceConflict = PostNamespace::query()
            ->whereIn('full_path', $paths)
            ->when(
                $ignoredNamespaceIds !== [],
                fn ($query) => $query->whereNotIn('id', $ignoredNamespaceIds),
            )
            ->value('full_path');

        if ($namespaceConflict !== null) {
            return $namespaceConflict;
        }

        return Post::query()
            ->whereIn('full_path', $paths)
            ->when(
                $ignoredPostIds !== [],
                fn ($query) => $query->whereNotIn('id', $ignoredPostIds),
            )
            ->value('full_path');
    }

    private static function joinPath(?string $prefix, string $slug): string
    {
        return trim(implode('/', array_filter([$prefix, $slug])), '/');
    }

    private static function replacePathPrefix(
        string $path,
        string $currentPrefix,
        string $futurePrefix,
    ): string {
        if ($path === $currentPrefix) {
            return $futurePrefix;
        }

        return self::joinPath(
            $futurePrefix,
            ltrim(substr($path, strlen($currentPrefix)), '/'),
        );
    }
}
