<?php

namespace App\Services;

use App\Models\Post;
use App\Models\PostNamespace;

class ContentPathService
{
    public function buildNamespacePath(PostNamespace $namespace): string
    {
        $parentPath = null;

        if ($namespace->parent_id) {
            $parentPath = $namespace->relationLoaded('parent')
                ? $namespace->parent?->full_path
                : PostNamespace::query()->whereKey($namespace->parent_id)->value('full_path');
        }

        return trim(implode('/', array_filter([$parentPath, $namespace->slug])), '/');
    }

    public function buildPostPath(Post $post): string
    {
        $namespacePath = $post->relationLoaded('namespace')
            ? $post->namespace?->full_path
            : PostNamespace::query()->whereKey($post->namespace_id)->value('full_path');

        return trim(implode('/', array_filter([$namespacePath, $post->slug])), '/');
    }

    public function syncNamespaceSubtree(PostNamespace $namespace): void
    {
        $namespacePaths = [$namespace->id => $namespace->full_path];
        $currentNamespaceIds = [$namespace->id];

        while ($currentNamespaceIds !== []) {
            $this->syncPostsForNamespaceIds($currentNamespaceIds, $namespacePaths);

            $children = PostNamespace::query()
                ->whereIn('parent_id', $currentNamespaceIds)
                ->orderBy('parent_id')
                ->orderBy('id')
                ->get(['id', 'parent_id', 'slug', 'full_path']);

            $nextNamespaceIds = [];

            foreach ($children as $child) {
                $fullPath = trim(implode('/', array_filter([
                    $namespacePaths[$child->parent_id] ?? null,
                    $child->slug,
                ])), '/');

                if ($child->full_path !== $fullPath) {
                    $child->forceFill([
                        'full_path' => $fullPath,
                    ])->saveQuietly();
                }

                $namespacePaths[$child->id] = $fullPath;
                $nextNamespaceIds[] = $child->id;
            }

            $currentNamespaceIds = $nextNamespaceIds;
        }
    }

    /**
     * @param  array<int, int>  $namespaceIds
     * @param  array<int, string|null>  $namespacePaths
     */
    private function syncPostsForNamespaceIds(array $namespaceIds, array $namespacePaths): void
    {
        Post::query()
            ->whereIn('namespace_id', $namespaceIds)
            ->orderBy('namespace_id')
            ->orderBy('id')
            ->get(['id', 'namespace_id', 'slug', 'full_path'])
            ->each(function (Post $post) use ($namespacePaths): void {
                $fullPath = trim(implode('/', array_filter([
                    $namespacePaths[$post->namespace_id] ?? null,
                    $post->slug,
                ])), '/');

                if ($post->full_path !== $fullPath) {
                    $post->forceFill([
                        'full_path' => $fullPath,
                    ])->saveQuietly();
                }
            });
    }
}
