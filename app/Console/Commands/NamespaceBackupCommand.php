<?php

namespace App\Console\Commands;

use App\Models\PostNamespace;
use Illuminate\Console\Command;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class NamespaceBackupCommand extends Command
{
    protected $signature = 'namespace:backup
                            {namespace : Namespace slug or ID}
                            {--output= : Output zip path (defaults to storage/app/private/backups/slug-timestamp.zip)}';

    protected $description = 'Backup a namespace and its posts as a zip archive';

    public function handle(): int
    {
        $input = $this->argument('namespace');

        $namespace = PostNamespace::where('slug', $input)->orWhere('id', $input)->first();

        if (! $namespace) {
            $this->error("Namespace not found: {$input}");

            return self::FAILURE;
        }

        if ($this->option('output')) {
            $zipPath = $this->option('output');
            $dir = dirname($zipPath);

            if (! is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        } else {
            $backupDir = storage_path('app/private/backups');

            if (! is_dir($backupDir)) {
                mkdir($backupDir, 0755, true);
            }

            $zipPath = $backupDir.'/'.$namespace->slug.'-'.now()->format('Ymd-His').'.zip';
        }

        $zip = new ZipArchive;

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            $this->error("Failed to create zip: {$zipPath}");

            return self::FAILURE;
        }

        $postCount = $this->addNamespaceToZip($zip, $namespace, '');

        $zip->close();

        $this->info("Backed up {$namespace->name} ({$postCount} posts) to:");
        $this->line($zipPath);

        return self::SUCCESS;
    }

    private function addNamespaceToZip(ZipArchive $zip, PostNamespace $namespace, string $prefix): int
    {
        $namespaceData = [
            'name' => $namespace->name,
            'slug' => $namespace->slug,
            'full_path' => $namespace->full_path,
            'description' => $namespace->description,
            'cover_image' => $namespace->cover_image,
            'is_published' => $namespace->is_published,
            'post_order' => $namespace->post_order ?? [],
            'sort_order' => $namespace->sort_order,
        ];

        $zip->addFromString($prefix.'_namespace.yaml', Yaml::dump($namespaceData, 4));

        $posts = $namespace->posts()->get();

        foreach ($posts as $post) {
            $frontmatter = [
                'title' => $post->title,
                'slug' => $post->slug,
                'full_path' => $post->full_path,
                'is_draft' => $post->is_draft,
                'published_at' => $post->published_at?->toIso8601String(),
            ];

            $content = "---\n".Yaml::dump($frontmatter)."---\n\n".$post->content."\n";

            $zip->addFromString($prefix.$post->slug.'.md', $content);
        }

        $postCount = $posts->count();

        foreach ($namespace->children()->get() as $child) {
            $postCount += $this->addNamespaceToZip($zip, $child, $prefix.$child->slug.'/');
        }

        return $postCount;
    }
}
