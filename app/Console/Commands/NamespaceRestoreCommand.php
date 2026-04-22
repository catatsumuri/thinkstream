<?php

namespace App\Console\Commands;

use App\Support\NamespaceRestoreArchive;
use Illuminate\Console\Command;
use RuntimeException;

class NamespaceRestoreCommand extends Command
{
    protected $signature = 'namespace:restore
                            {path : Path to a backup zip or directory}
                            {--with-revisions : Import post revision history if present in the backup}';

    protected $description = 'Restore a namespace and its posts from a backup zip or directory';

    public function handle(NamespaceRestoreArchive $restoreArchive): int
    {
        try {
            foreach ($restoreArchive->restore(
                $this->argument('path'),
                (bool) $this->option('with-revisions'),
            ) as $event) {
                $this->line($event['message']);
            }

            return self::SUCCESS;
        } catch (RuntimeException $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
