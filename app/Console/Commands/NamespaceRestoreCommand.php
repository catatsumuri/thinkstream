<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Console\Command;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class NamespaceRestoreCommand extends Command
{
    protected $signature = 'namespace:restore {path : Path to a backup zip or directory}';

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

        $namespaceData = Yaml::parseFile($namespacePath);
        $user = User::query()->first();

        if (! $user) {
            $this->error('Cannot restore posts without an existing user.');

            return self::FAILURE;
        }

        $namespace = PostNamespace::updateOrCreate(
            ['slug' => $namespaceData['slug']],
            array_filter([
                'full_path' => $namespaceData['full_path'] ?? null,
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

            Post::updateOrCreate(
                ['namespace_id' => $namespace->id, 'slug' => $frontmatter['slug']],
                [
                    'user_id' => $user->id,
                    'title' => $frontmatter['title'],
                    'full_path' => $frontmatter['full_path'] ?? null,
                    'content' => $body,
                    'is_draft' => $frontmatter['is_draft'] ?? false,
                    'published_at' => $frontmatter['published_at'] ?? null,
                ],
            );

            $postCount++;
        }

        $this->info("Restored {$namespace->name} ({$postCount} posts).");

        return self::SUCCESS;
    }

    private function removeDirectory(string $path): void
    {
        foreach (glob($path.'/*') as $file) {
            is_dir($file) ? $this->removeDirectory($file) : unlink($file);
        }

        rmdir($path);
    }
}
