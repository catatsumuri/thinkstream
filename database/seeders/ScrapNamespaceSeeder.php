<?php

namespace Database\Seeders;

use App\Models\PostNamespace;
use Illuminate\Database\Seeder;

class ScrapNamespaceSeeder extends Seeder
{
    public function run(): void
    {
        PostNamespace::updateOrCreate(
            ['full_path' => 'scrap'],
            [
                'slug' => 'scrap',
                'name' => 'Scrap',
                'full_path' => 'scrap',
                'description' => 'Auto-saved drafts and refined thoughts.',
                'is_published' => false,
                'is_system' => true,
            ]
        );
    }
}
