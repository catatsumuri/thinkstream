<?php

namespace Database\Seeders;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Database\Seeder;

class RoutingCheckSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'test@example.com'],
            ['name' => 'Test User', 'password' => bcrypt('password')],
        );

        $apiaryNamespace = PostNamespace::updateOrCreate(
            ['slug' => 'apiary'],
            [
                'name' => 'Apiary',
                'description' => 'Reserved-path lookalike content used to verify wildcard routing still accepts non-reserved slugs.',
            ],
        );

        Post::updateOrCreate(
            ['namespace_id' => $apiaryNamespace->id, 'slug' => 'routing-check'],
            [
                'user_id' => $user->id,
                'title' => 'APIary Routing Check',
                'content' => trim(<<<'MD'
# APIary Routing Check

This namespace exists so `/apiary` proves the content wildcard still resolves lookalike slugs while `/api/*` stays reserved.
MD),
                'published_at' => now(),
            ],
        );

        $administratorNamespace = PostNamespace::updateOrCreate(
            ['slug' => 'administrator'],
            [
                'name' => 'Administrator Notes',
                'description' => 'Reserved-path lookalike content used to verify wildcard routing still accepts non-reserved admin-like slugs.',
            ],
        );

        Post::updateOrCreate(
            ['namespace_id' => $administratorNamespace->id, 'slug' => 'routing-check'],
            [
                'user_id' => $user->id,
                'title' => 'Administrator Routing Check',
                'content' => trim(<<<'MD'
# Administrator Routing Check

This namespace exists so `/administrator` proves the content wildcard still resolves lookalike slugs while `/admin/*` stays reserved.
MD),
                'published_at' => now(),
            ],
        );
    }
}
