<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Post>
 */
class PostFactory extends Factory
{
    public function definition(): array
    {
        $title = fake()->sentence(4);

        return [
            'namespace_id' => PostNamespace::factory(),
            'user_id' => User::factory(),
            'title' => $title,
            'slug' => Str::slug($title),
            'content' => implode("\n\n", fake()->paragraphs(3)),
            'is_draft' => false,
            'published_at' => now(),
        ];
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_draft' => true,
            'published_at' => null,
        ]);
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_draft' => false,
            'published_at' => now(),
        ]);
    }

    public function scheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_draft' => false,
            'published_at' => now()->addDay(),
        ]);
    }
}
