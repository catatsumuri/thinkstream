<?php

namespace Database\Factories;

use App\Models\ThinkstreamPage;
use App\Models\Thought;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Thought>
 */
class ThoughtFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'page_id' => ThinkstreamPage::factory(),
            'content' => fake()->paragraph(),
        ];
    }
}
