<?php

namespace Database\Factories;

use App\Models\ThinkstreamPage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ThinkstreamPage>
 */
class ThinkstreamPageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => 'Canvas '.now()->format('Y-m-d H:i'),
        ];
    }
}
