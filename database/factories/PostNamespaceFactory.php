<?php

namespace Database\Factories;

use App\Models\PostNamespace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PostNamespace>
 */
class PostNamespaceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->words(2, true);

        return [
            'slug' => fake()->unique()->slug(),
            'name' => Str::title($name),
            'description' => fake()->sentence(),
            'is_published' => true,
        ];
    }
}
