<?php

namespace Database\Factories;

use App\Models\Post;
use App\Models\PostRevision;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PostRevision>
 */
class PostRevisionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $title = fake()->sentence(4);

        return [
            'post_id' => Post::factory(),
            'user_id' => User::factory(),
            'title' => $title,
            'content' => implode("\n\n", fake()->paragraphs(2)),
        ];
    }
}
