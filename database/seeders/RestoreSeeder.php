<?php

namespace Database\Seeders;

use App\Models\ThinkstreamPage;
use App\Models\Thought;
use App\Models\User;
use App\Support\NamespaceBackupArchive;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use JsonException;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class RestoreSeeder extends Seeder
{
    public function run(): void
    {
        $this->restoreNamespaces();
        $this->restoreThinkstream();
    }

    private function restoreNamespaces(): void
    {
        $backupDir = NamespaceBackupArchive::directory();

        $zips = glob($backupDir.'/*.zip') ?: [];

        if (empty($zips)) {
            $this->command->line('No namespace backup zips found.');

            return;
        }

        $latest = [];

        foreach ($zips as $zip) {
            $slug = $this->readNamespaceSlug($zip);

            if ($slug === null) {
                $this->command->warn('Skipping '.basename($zip).': could not read _namespace.yaml');

                continue;
            }

            if (! isset($latest[$slug]) || filemtime($zip) > filemtime($latest[$slug])) {
                $latest[$slug] = $zip;
            }
        }

        foreach ($latest as $zip) {
            Artisan::call('namespace:restore', ['path' => $zip]);
            $this->command->line(trim(Artisan::output()));
        }
    }

    private function restoreThinkstream(): void
    {
        $dir = storage_path('app/private/thinkstream-backups');

        $zips = glob($dir.'/thinkstream-*.zip') ?: [];

        if (empty($zips)) {
            $this->command->line('No Thinkstream backup zips found.');

            return;
        }

        foreach ($zips as $zipPath) {
            $filename = basename($zipPath, '.zip');

            if (! preg_match('/^thinkstream-(\d+)$/', $filename, $matches)) {
                continue;
            }

            $userId = (int) $matches[1];
            $user = User::find($userId);

            if ($user === null) {
                $this->command->warn("Skipping {$filename}.zip: user ID {$userId} not found.");

                continue;
            }

            $pages = $this->readThinkstreamPages($zipPath);

            if ($pages === null) {
                $this->command->warn("Could not read a valid thinkstream.json from {$filename}.zip");

                continue;
            }

            DB::transaction(function () use ($pages, $userId): void {
                ThinkstreamPage::where('user_id', $userId)->delete();

                foreach ($pages as $pageData) {
                    $page = ThinkstreamPage::create([
                        'user_id' => $userId,
                        'title' => $pageData['title'],
                        'created_at' => $pageData['created_at'],
                        'updated_at' => $pageData['created_at'],
                    ]);

                    foreach ($pageData['thoughts'] as $thoughtData) {
                        Thought::create([
                            'user_id' => $userId,
                            'page_id' => $page->id,
                            'content' => $thoughtData['content'],
                            'created_at' => $thoughtData['created_at'],
                            'updated_at' => $thoughtData['created_at'],
                        ]);
                    }
                }
            });

            $pageCount = count($pages);
            $this->command->line('Restored '.$pageCount.' Thinkstream canvas'.($pageCount === 1 ? '' : 'es')." for user #{$userId} ({$user->name}).");
        }
    }

    /**
     * @return array<int, array{title: string, created_at: string, thoughts: array<int, array{content: string, created_at: string}>}>|null
     */
    private function readThinkstreamPages(string $zipPath): ?array
    {
        $zip = new ZipArchive;

        if ($zip->open($zipPath) !== true) {
            return null;
        }

        $json = $zip->getFromName('thinkstream.json');
        $zip->close();

        if (! is_string($json) || $json === '') {
            return null;
        }

        try {
            $pages = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return null;
        }

        return is_array($pages) ? $pages : null;
    }

    private function readNamespaceSlug(string $zipPath): ?string
    {
        $zip = new ZipArchive;

        if ($zip->open($zipPath) !== true) {
            return null;
        }

        $yaml = $zip->getFromName('_namespace.yaml');
        $zip->close();

        if ($yaml === false) {
            return null;
        }

        $data = Yaml::parse($yaml);

        return $data['slug'] ?? null;
    }
}
