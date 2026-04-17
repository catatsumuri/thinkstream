<?php

use App\Services\InertiaJsDocsImporter;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Console\Command\Command as SymfonyCommand;

Artisan::command(
    'posts:import-inertia-docs
        {path=database/inertiajs-docs/v3 : Path to the Inertia.js MDX docs directory}
        {--namespace-slug=inertiajs-v3 : Slug for the destination namespace}
        {--namespace-name=InertiaJS V3 : Display name for the destination namespace}
        {--namespace-description=Official Inertia.js v3 documentation imported from local MDX sources. : Description for the destination namespace}
        {--user-email=docs-importer@example.com : User email to assign imported posts to}',
    function (InertiaJsDocsImporter $importer): int {
        $result = $importer->import(
            sourcePath: (string) $this->argument('path'),
            namespaceSlug: (string) $this->option('namespace-slug'),
            namespaceName: (string) $this->option('namespace-name'),
            namespaceDescription: (string) $this->option('namespace-description'),
            userEmail: (string) $this->option('user-email'),
        );

        if (! $result['imported']) {
            $this->error($result['message']);

            return SymfonyCommand::FAILURE;
        }

        $this->info($result['message']);
        $this->newLine();
        $this->line('Namespace: '.$result['namespace_slug']);
        $this->line('Posts imported: '.$result['post_count']);
        $this->line('Source: '.$result['source_path']);

        return SymfonyCommand::SUCCESS;
    }
)->purpose('Import local Inertia.js MDX documentation into posts and namespaces.');
