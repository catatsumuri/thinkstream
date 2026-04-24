<?php

namespace App\Support;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostRevision;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class NamespaceRestoreArchive
{
    public function directory(): string
    {
        return storage_path('app/private/restore-imports');
    }

    public function storeUpload(UploadedFile $file): string
    {
        $token = (string) Str::uuid();

        File::ensureDirectoryExists($this->directory());
        File::copy($file->getRealPath(), $this->tokenPath($token));

        return $token;
    }

    public function tokenPath(string $token): string
    {
        return $this->directory().'/'.$token.'.zip';
    }

    public function hasToken(string $token): bool
    {
        return File::isFile($this->tokenPath($token));
    }

    public function deleteToken(string $token): void
    {
        if ($this->hasToken($token)) {
            File::delete($this->tokenPath($token));
        }
    }

    /**
     * @return array{
     *     root: array{name: string, slug: string, full_path: string, status: string},
     *     totals: array{
     *         namespace_count: int,
     *         existing_namespace_count: int,
     *         new_namespace_count: int,
     *         post_count: int,
     *         existing_post_count: int,
     *         new_post_count: int
     *     },
     *     namespaces: array<int, array{
     *         name: string,
     *         slug: string,
     *         full_path: string,
     *         status: string,
     *         post_count: int,
     *         existing_post_count: int,
     *         new_post_count: int
     *     }>
     * }
     */
    public function preview(string $path): array
    {
        [$workingPath, $cleanup] = $this->preparePath($path);

        try {
            $namespaces = $this->previewDirectory($workingPath);

            if ($namespaces === []) {
                throw new RuntimeException('The restore archive does not contain any namespaces.');
            }

            $root = $namespaces[0];

            return [
                'root' => [
                    'name' => $root['name'],
                    'slug' => $root['slug'],
                    'full_path' => $root['full_path'],
                    'status' => $root['status'],
                ],
                'totals' => [
                    'namespace_count' => count($namespaces),
                    'existing_namespace_count' => collect($namespaces)->where('status', 'existing')->count(),
                    'new_namespace_count' => collect($namespaces)->where('status', 'new')->count(),
                    'post_count' => array_sum(array_column($namespaces, 'post_count')),
                    'existing_post_count' => array_sum(array_column($namespaces, 'existing_post_count')),
                    'new_post_count' => array_sum(array_column($namespaces, 'new_post_count')),
                ],
                'namespaces' => $namespaces,
            ];
        } finally {
            if ($cleanup) {
                $this->removeDirectory($workingPath);
            }
        }
    }

    /**
     * @return \Generator<int, array{type: string, message: string}>
     */
    public function restore(string $path, bool $withRevisions = false): \Generator
    {
        [$workingPath, $cleanup] = $this->preparePath($path);

        try {
            $user = User::query()->first();

            if (! $user) {
                throw new RuntimeException('Cannot restore posts without an existing user.');
            }

            yield ['type' => 'info', 'message' => 'Starting namespace restore.'];

            $postCount = yield from $this->restoreDirectory($workingPath, null, $user, $withRevisions);

            yield from $this->restorePublicFiles($workingPath);

            yield ['type' => 'success', 'message' => "Restored {$postCount} posts."];
        } finally {
            if ($cleanup) {
                $this->removeDirectory($workingPath);
            }
        }
    }

    /**
     * @return array{0: string, 1: bool}
     */
    private function preparePath(string $path): array
    {
        if (str_ends_with($path, '.zip')) {
            if (! File::isFile($path)) {
                throw new RuntimeException("Zip file not found: {$path}");
            }

            $tempDir = sys_get_temp_dir().'/namespace-restore-'.uniqid();
            File::ensureDirectoryExists($tempDir);

            $zip = new ZipArchive;

            if ($zip->open($path) !== true) {
                throw new RuntimeException("Failed to open zip: {$path}");
            }

            $this->assertSafeZipEntries($zip);
            $zip->extractTo($tempDir);
            $zip->close();

            return [$tempDir, true];
        }

        if (! File::isDirectory($path)) {
            throw new RuntimeException("Backup directory not found: {$path}");
        }

        return [$path, false];
    }

    /**
     * @return array<int, array{
     *     name: string,
     *     slug: string,
     *     full_path: string,
     *     status: string,
     *     post_count: int,
     *     existing_post_count: int,
     *     new_post_count: int
     * }>
     */
    private function previewDirectory(string $path): array
    {
        $namespaceData = $this->readNamespaceData($path);
        $namespaceFullPath = $this->namespaceFullPath($namespaceData);
        $postSummaries = $this->postSummaries($path, $namespaceFullPath);
        $childSummaries = [];

        foreach (glob($path.'/*/', GLOB_ONLYDIR) ?: [] as $childPath) {
            if (File::exists($childPath.'_namespace.yaml')) {
                $childSummaries = [...$childSummaries, ...$this->previewDirectory(rtrim($childPath, '/'))];
            }
        }

        return [[
            'name' => (string) $namespaceData['name'],
            'slug' => (string) $namespaceData['slug'],
            'full_path' => $namespaceFullPath,
            'status' => PostNamespace::query()->where('full_path', $namespaceFullPath)->exists() ? 'existing' : 'new',
            'post_count' => count($postSummaries),
            'existing_post_count' => collect($postSummaries)->where('status', 'existing')->count(),
            'new_post_count' => collect($postSummaries)->where('status', 'new')->count(),
        ], ...$childSummaries];
    }

    /**
     * @return array<int, array{full_path: string, status: string}>
     */
    private function postSummaries(string $path, string $namespaceFullPath): array
    {
        $summaries = [];

        foreach (glob($path.'/*.md') ?: [] as $file) {
            $frontmatter = $this->readPostFrontmatter($file);
            $fullPath = (string) ($frontmatter['full_path'] ?? trim($namespaceFullPath.'/'.$frontmatter['slug'], '/'));

            $summaries[] = [
                'full_path' => $fullPath,
                'status' => Post::query()->where('full_path', $fullPath)->exists() ? 'existing' : 'new',
            ];
        }

        return $summaries;
    }

    /**
     * @return \Generator<int, array{type: string, message: string}, int, int>
     */
    private function restoreDirectory(string $path, ?PostNamespace $parent, User $user, bool $withRevisions): \Generator
    {
        $namespaceData = $this->readNamespaceData($path);
        $namespaceFullPath = $this->namespaceFullPath($namespaceData);
        $existingNamespace = PostNamespace::query()->where('full_path', $namespaceFullPath)->first();

        yield [
            'type' => 'info',
            'message' => ($existingNamespace ? 'Updating' : 'Creating')." namespace {$namespaceFullPath}",
        ];

        $namespace = $existingNamespace ?? new PostNamespace;
        $namespace->parent_id = $parent?->id;
        $namespace->slug = (string) $namespaceData['slug'];
        $namespace->name = (string) $namespaceData['name'];
        $namespace->description = $namespaceData['description'] ?? null;
        $namespace->cover_image = $namespaceData['cover_image'] ?? null;
        $namespace->is_published = (bool) ($namespaceData['is_published'] ?? true);
        $namespace->post_order = $namespaceData['post_order'] ?? [];
        $namespace->save();

        if (array_key_exists('sort_order', $namespaceData)) {
            $namespace->sort_order = $namespaceData['sort_order'];
            $namespace->save();
        }

        $postCount = 0;

        foreach (glob($path.'/*.md') ?: [] as $file) {
            $raw = File::get($file);
            [$frontmatter, $body] = $this->parseMarkdownFile($raw);
            $postFullPath = (string) ($frontmatter['full_path'] ?? trim($namespaceFullPath.'/'.$frontmatter['slug'], '/'));
            $existingPost = Post::query()->where('full_path', $postFullPath)->first();

            yield [
                'type' => 'info',
                'message' => ($existingPost ? 'Updating' : 'Creating')." post {$postFullPath}",
            ];

            $post = $existingPost ?? new Post;
            $post->namespace_id = $namespace->id;
            $post->user_id = $user->id;
            $post->title = (string) $frontmatter['title'];
            $post->slug = (string) $frontmatter['slug'];
            $post->content = $body;
            $post->page_views = (int) ($frontmatter['page_views'] ?? 0);
            $post->is_draft = (bool) ($frontmatter['is_draft'] ?? false);
            $post->published_at = $frontmatter['published_at'] ?? null;
            $post->reference_title = $frontmatter['reference_title'] ?? null;
            $post->reference_url = $frontmatter['reference_url'] ?? null;
            $post->save();

            if ($withRevisions) {
                $revisionsPath = $path.'/'.$post->slug.'.revisions.json';

                if (File::exists($revisionsPath)) {
                    $this->restoreRevisions($post, $revisionsPath);

                    yield [
                        'type' => 'info',
                        'message' => "Imported revisions for {$postFullPath}",
                    ];
                }
            }

            $postCount++;
        }

        foreach (glob($path.'/*/', GLOB_ONLYDIR) ?: [] as $childPath) {
            if (File::exists($childPath.'_namespace.yaml')) {
                $postCount += yield from $this->restoreDirectory(rtrim($childPath, '/'), $namespace, $user, $withRevisions);
            }
        }

        return $postCount;
    }

    /**
     * @return \Generator<int, array{type: string, message: string}>
     */
    private function restorePublicFiles(string $path): \Generator
    {
        $filesDirectory = $path.'/_files';

        if (! File::isDirectory($filesDirectory)) {
            return;
        }

        $disk = Storage::disk('public');

        foreach (File::allFiles($filesDirectory) as $file) {
            $relativePath = $this->normalizeRestoredFilePath(
                ltrim(str_replace($filesDirectory, '', $file->getPathname()), DIRECTORY_SEPARATOR)
            );
            $disk->put($relativePath, file_get_contents($file->getPathname()));

            yield [
                'type' => 'info',
                'message' => "Restored file {$relativePath}",
            ];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function readNamespaceData(string $path): array
    {
        $namespacePath = $path.'/_namespace.yaml';

        if (! File::exists($namespacePath)) {
            throw new RuntimeException("_namespace.yaml not found in: {$path}");
        }

        $data = Yaml::parseFile($namespacePath);

        if (! is_array($data) || ! isset($data['slug'], $data['name'])) {
            throw new RuntimeException("Invalid namespace metadata in: {$namespacePath}");
        }

        return $data;
    }

    private function namespaceFullPath(array $namespaceData): string
    {
        $fullPath = (string) ($namespaceData['full_path'] ?? $namespaceData['slug']);

        if ($fullPath === '') {
            throw new RuntimeException('The restore archive contains a namespace without a full_path.');
        }

        return $fullPath;
    }

    /**
     * @return array{0: array<string, mixed>, 1: string}
     */
    private function parseMarkdownFile(string $raw): array
    {
        if (! preg_match('/\A---\r?\n(.*?)\r?\n---\r?\n?/s', $raw, $matches)) {
            throw new RuntimeException('The restore archive contains a markdown file without frontmatter.');
        }

        $frontmatter = Yaml::parse($matches[1]);

        if (! is_array($frontmatter) || ! isset($frontmatter['slug'], $frontmatter['title'])) {
            throw new RuntimeException('The restore archive contains invalid post frontmatter.');
        }

        return [$frontmatter, trim(substr($raw, strlen($matches[0])))];
    }

    /**
     * @return array<string, mixed>
     */
    private function readPostFrontmatter(string $file): array
    {
        [$frontmatter] = $this->parseMarkdownFile(File::get($file));

        return $frontmatter;
    }

    private function restoreRevisions(Post $post, string $revisionsPath): void
    {
        $data = json_decode(File::get($revisionsPath), true);

        if (! is_array($data) || $data === []) {
            return;
        }

        $post->revisions()->delete();

        $now = now();

        $records = array_map(fn (array $revision) => [
            'post_id' => $post->id,
            'user_id' => null,
            'title' => $revision['title'],
            'content' => $revision['content'],
            'created_at' => $revision['created_at'],
            'updated_at' => $now,
        ], $data);

        PostRevision::insert($records);
    }

    private function assertSafeZipEntries(ZipArchive $zip): void
    {
        for ($index = 0; $index < $zip->numFiles; $index++) {
            $entry = $zip->statIndex($index);
            $entryName = $entry['name'] ?? null;

            if (! is_string($entryName)) {
                throw new RuntimeException('The restore archive contains an unreadable file entry.');
            }

            $this->normalizeRestoredFilePath($entryName);
        }
    }

    private function normalizeRestoredFilePath(string $path): string
    {
        $normalizedPath = trim(str_replace('\\', '/', $path), '/');

        if ($normalizedPath === '' || str_contains($normalizedPath, "\0")) {
            throw new RuntimeException('The restore archive contains an invalid file path.');
        }

        $segments = explode('/', $normalizedPath);

        foreach ($segments as $segment) {
            if ($segment === '' || $segment === '.' || $segment === '..') {
                throw new RuntimeException('The restore archive contains an invalid file path.');
            }
        }

        return implode('/', $segments);
    }

    private function removeDirectory(string $path): void
    {
        foreach (glob($path.'/*') ?: [] as $file) {
            is_dir($file) ? $this->removeDirectory($file) : unlink($file);
        }

        @rmdir($path);
    }
}
