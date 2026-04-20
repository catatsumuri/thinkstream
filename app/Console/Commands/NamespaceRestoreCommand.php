<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostRevision;
use App\Models\User;
use Illuminate\Console\Command;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class NamespaceRestoreCommand extends Command
{
    protected $signature = 'namespace:restore
                            {path : Path to a backup zip or directory}
                            {--with-revisions : Import post revision history if present in the backup}';

    protected $description = 'Restore a namespace and its posts from a backup zip or directory';

    public function handle(): int
    {
        $path = $this->argument('path');

        if (str_ends_with($path, '.zip')) {
            $path = $this->extractZip($path);

            if ($path === null) {
                return self::FAILURE;
            }

            $cleanup = true;
        } else {
            $cleanup = false;
        }

        try {
            return $this->restore($path);
        } finally {
            if ($cleanup) {
                $this->removeDirectory($path);
            }
        }
    }

    private function extractZip(string $zipPath): ?string
    {
        if (! file_exists($zipPath)) {
            $this->error("Zip file not found: {$zipPath}");

            return null;
        }

        $tempDir = sys_get_temp_dir().'/namespace-restore-'.uniqid();
        mkdir($tempDir, 0755, true);

        $zip = new ZipArchive;

        if ($zip->open($zipPath) !== true) {
            $this->error("Failed to open zip: {$zipPath}");
            rmdir($tempDir);

            return null;
        }

        $zip->extractTo($tempDir);
        $zip->close();

        return $tempDir;
    }

    private function restore(string $path): int
    {
        if (! is_dir($path)) {
            $this->error("Backup directory not found: {$path}");

            return self::FAILURE;
        }

        $namespacePath = $path.'/_namespace.yaml';

        if (! file_exists($namespacePath)) {
            $this->error("_namespace.yaml not found in: {$path}");

            return self::FAILURE;
        }

        $user = User::query()->first();

        if (! $user) {
            $this->error('Cannot restore posts without an existing user.');

            return self::FAILURE;
        }

        $withRevisions = (bool) $this->option('with-revisions');
        $postCount = $this->restoreDirectory($path, null, $user, $withRevisions);

        $this->info("Restored {$postCount} posts.");

        return self::SUCCESS;
    }

    private function restoreDirectory(string $path, ?PostNamespace $parent, User $user, bool $withRevisions): int
    {
        $namespaceData = Yaml::parseFile($path.'/_namespace.yaml');

        $namespace = PostNamespace::updateOrCreate(
            ['slug' => $namespaceData['slug']],
            array_filter([
                'parent_id' => $parent?->id,
                'name' => $namespaceData['name'],
                'description' => $namespaceData['description'] ?? null,
                'cover_image' => $namespaceData['cover_image'] ?? null,
                'is_published' => $namespaceData['is_published'] ?? true,
                'post_order' => $namespaceData['post_order'] ?? [],
            ], fn ($v) => $v !== null),
        );

        if (isset($namespaceData['sort_order'])) {
            $namespace->sort_order = $namespaceData['sort_order'];
            $namespace->save();
        }

        $postCount = 0;

        foreach (glob($path.'/*.md') as $file) {
            $raw = file_get_contents($file);

            if (! preg_match('/\A---\r?\n(.*?)\r?\n---\r?\n?/s', $raw, $matches)) {
                $this->warn('Skipping '.basename($file).': no frontmatter found');

                continue;
            }

            $frontmatter = Yaml::parse($matches[1]);
            $body = trim(substr($raw, strlen($matches[0])));

            $post = Post::updateOrCreate(
                ['namespace_id' => $namespace->id, 'slug' => $frontmatter['slug']],
                [
                    'user_id' => $user->id,
                    'title' => $frontmatter['title'],
                    'content' => $body,
                    'is_draft' => $frontmatter['is_draft'] ?? false,
                    'published_at' => $frontmatter['published_at'] ?? null,
                ],
            );

            if ($withRevisions) {
                $this->restoreRevisions($post, $path.'/'.$frontmatter['slug'].'.revisions.json');
            }

            $postCount++;
        }

        $this->info("  Restored {$namespace->name} ({$postCount} posts).");

        foreach (glob($path.'/*/') as $childDir) {
            if (file_exists($childDir.'_namespace.yaml')) {
                $postCount += $this->restoreDirectory($childDir, $namespace, $user, $withRevisions);
            }
        }

        return $postCount;
    }

    private function restoreRevisions(Post $post, string $revisionsPath): void
    {
        if (! file_exists($revisionsPath)) {
            return;
        }

        $data = json_decode(file_get_contents($revisionsPath), true);

        if (! is_array($data) || empty($data)) {
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

    private function removeDirectory(string $path): void
    {
        foreach (glob($path.'/*') as $file) {
            is_dir($file) ? $this->removeDirectory($file) : unlink($file);
        }

        rmdir($path);
    }
}
