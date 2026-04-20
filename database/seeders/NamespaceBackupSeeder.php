<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class NamespaceBackupSeeder extends Seeder
{
    public function run(): void
    {
        $backupDir = database_path('backups');

        $zips = glob($backupDir.'/*.zip');

        if (empty($zips)) {
            $this->command->line('No backup zips found in database/backups/');

            return;
        }

        // Group by namespace slug, keep only the latest (by file mtime) per slug
        $latest = [];

        foreach ($zips as $zip) {
            $slug = $this->readSlug($zip);

            if ($slug === null) {
                $this->command->warn('Skipping '.basename($zip).': could not read _namespace.yaml');

                continue;
            }

            if (! isset($latest[$slug]) || filemtime($zip) > filemtime($latest[$slug])) {
                $latest[$slug] = $zip;
            }
        }

        foreach ($latest as $slug => $zip) {
            Artisan::call('namespace:restore', ['path' => $zip]);
            $this->command->line(trim(Artisan::output()));
        }
    }

    private function readSlug(string $zipPath): ?string
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
