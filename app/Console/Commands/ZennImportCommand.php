<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ZennImportCommand extends Command
{
    protected $signature = 'zenn:import
                            {path : Path to the directory containing Zenn article .md files}
                            {--namespace=zenn : Slug for the root namespace}
                            {--namespace-name=Zenn : Display name for the root namespace}
                            {--user=1 : User ID to assign posts to}
                            {--dry-run : Preview without writing to the database}';

    protected $description = 'Import Zenn-exported markdown articles into ThinkStream';

    public function handle(): int
    {
        $path = $this->argument('path');
        $namespaceSlug = $this->option('namespace');
        $namespaceName = $this->option('namespace-name');
        $userId = (int) $this->option('user');
        $dryRun = $this->option('dry-run');

        if (! is_dir($path)) {
            $this->error("Directory not found: {$path}");

            return self::FAILURE;
        }

        $user = User::find($userId);
        if (! $user) {
            $this->error("User with ID {$userId} not found.");

            return self::FAILURE;
        }

        $files = glob(rtrim($path, '/').'/*.md');
        if (empty($files)) {
            $this->warn('No .md files found in the specified directory.');

            return self::SUCCESS;
        }

        $this->info('Found '.count($files)." articles. User: {$user->name}");

        if ($dryRun) {
            $this->warn('[DRY RUN] No changes will be written.');
        }

        $namespace = null;
        if (! $dryRun) {
            $namespace = PostNamespace::firstOrCreate(
                ['slug' => $namespaceSlug, 'parent_id' => null],
                [
                    'name' => $namespaceName,
                    'full_path' => $namespaceSlug,
                    'is_published' => true,
                ],
            );
            $this->info("Namespace: [{$namespace->id}] {$namespace->full_path}");
        }

        $created = 0;
        $skipped = 0;

        foreach ($files as $file) {
            $raw = file_get_contents($file);
            $slug = pathinfo($file, PATHINFO_FILENAME);

            [$frontmatter, $content] = $this->parseFrontmatter($raw);

            $title = $frontmatter['title'] ?? $slug;
            $published = ($frontmatter['published'] ?? false) === true;
            $publishedAt = isset($frontmatter['published_at'])
                ? Carbon::parse($frontmatter['published_at'])
                : null;

            if ($dryRun) {
                $status = $published ? '<info>pub </info>' : '<comment>drft</comment>';
                $this->line("  [{$status}] {$slug} — {$title}");
                $created++;

                continue;
            }

            $fullPath = $namespaceSlug.'/'.$slug;

            if (Post::where('full_path', $fullPath)->exists()) {
                $this->line("  <comment>SKIP</comment> {$slug} (already exists)");
                $skipped++;

                continue;
            }

            Post::create([
                'user_id' => $userId,
                'namespace_id' => $namespace->id,
                'title' => $title,
                'slug' => $slug,
                'full_path' => $fullPath,
                'content' => $content,
                'is_draft' => ! $published,
                'published_at' => $publishedAt,
            ]);

            $status = $published ? '<info>pub </info>' : '<comment>drft</comment>';
            $this->line("  [{$status}] {$slug} — {$title}");
            $created++;
        }

        $this->newLine();
        if ($dryRun) {
            $this->info("Would import {$created} articles.");
        } else {
            $this->info("Done. Created: {$created}, Skipped: {$skipped}.");
        }

        return self::SUCCESS;
    }

    /**
     * @return array{0: array<string, mixed>, 1: string}
     */
    private function parseFrontmatter(string $raw): array
    {
        if (! str_starts_with($raw, '---')) {
            return [[], $raw];
        }

        $end = strpos($raw, '---', 3);
        if ($end === false) {
            return [[], $raw];
        }

        $yamlBlock = substr($raw, 3, $end - 3);
        $content = ltrim(substr($raw, $end + 3));

        $frontmatter = [];
        foreach (explode("\n", $yamlBlock) as $line) {
            $line = rtrim($line);
            if (! str_contains($line, ':')) {
                continue;
            }

            [$key, $value] = explode(':', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\"'");

            if ($value === 'true') {
                $frontmatter[$key] = true;
            } elseif ($value === 'false') {
                $frontmatter[$key] = false;
            } elseif ($value !== '') {
                $frontmatter[$key] = $value;
            }
        }

        return [$frontmatter, $content];
    }
}
