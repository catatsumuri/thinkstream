<?php

namespace App\Console\Commands;

use App\Models\PostNamespace;
use App\Support\NamespaceBackupArchive;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class NamespaceBackupCommand extends Command
{
    protected $signature = 'namespace:backup
                             {namespace : Namespace slug or ID}
                             {--output= : Output zip path (defaults to storage/app/private/backups/namespace-id-path-timestamp.zip)}
                             {--with-revisions : Include post revision history in the backup}';

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
            $backupDir = NamespaceBackupArchive::directory();

            if (! is_dir($backupDir)) {
                mkdir($backupDir, 0755, true);
            }

            $zipPath = NamespaceBackupArchive::defaultPath($namespace);
        }

        $zip = new ZipArchive;

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            $this->error("Failed to create zip: {$zipPath}");

            return self::FAILURE;
        }

        $withRevisions = (bool) $this->option('with-revisions');
        $postCount = $this->addNamespaceToZip($zip, $namespace, '', $withRevisions);

        $zip->close();

        $this->info("Backed up {$namespace->name} ({$postCount} posts) to:");
        $this->line($zipPath);

        return self::SUCCESS;
    }

    private function addNamespaceToZip(ZipArchive $zip, PostNamespace $namespace, string $prefix, bool $withRevisions): int
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

        foreach ($this->imagePathsForNamespace($namespace) as $imagePath) {
            $this->addPublicFileToZip($zip, $imagePath);
        }

        $posts = $withRevisions
            ? $namespace->posts()->with('revisions.user')->get()
            : $namespace->posts()->get();

        foreach ($posts as $post) {
            $frontmatter = [
                'title' => $post->title,
                'slug' => $post->slug,
                'full_path' => $post->full_path,
                'page_views' => $post->page_views,
                'is_draft' => $post->is_draft,
                'published_at' => $post->published_at?->toIso8601String(),
                'reference_title' => $post->reference_title,
                'reference_url' => $post->reference_url,
            ];

            $content = "---\n".Yaml::dump($frontmatter)."---\n\n".$post->content."\n";

            $zip->addFromString($prefix.$post->slug.'.md', $content);

            foreach ($this->imagePathsFromContent($post->content) as $imagePath) {
                $this->addPublicFileToZip($zip, $imagePath);
            }

            if ($withRevisions && $post->revisions->isNotEmpty()) {
                $revisionsData = $post->revisions
                    ->sortBy('id')
                    ->map(fn ($revision) => [
                        'title' => $revision->title,
                        'content' => $revision->content,
                        'user_name' => $revision->user?->name,
                        'created_at' => $revision->created_at->toIso8601String(),
                    ])
                    ->values()
                    ->all();

                $zip->addFromString(
                    $prefix.$post->slug.'.revisions.json',
                    json_encode($revisionsData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
                );
            }
        }

        $postCount = $posts->count();

        foreach ($namespace->children()->get() as $child) {
            $postCount += $this->addNamespaceToZip($zip, $child, $prefix.$child->slug.'/', $withRevisions);
        }

        return $postCount;
    }

    /**
     * @return array<int, string>
     */
    private function imagePathsForNamespace(PostNamespace $namespace): array
    {
        return collect([$namespace->cover_image])
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function imagePathsFromContent(string $content): array
    {
        preg_match_all('/\/(?:images|storage)\/([^"\'\s)\]>?#]+)/', $content, $matches);

        return collect($matches[1] ?? [])
            ->map(fn (string $path): string => ltrim(urldecode($path), '/'))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function addPublicFileToZip(ZipArchive $zip, string $path): void
    {
        $disk = Storage::disk('public');

        if (! $disk->exists($path)) {
            return;
        }

        $zip->addFromString('_files/'.$path, $disk->get($path));
    }
}
