<?php

namespace App\Support;

use Laravel\Ai\Responses\Data\Meta;
use Laravel\Ai\Responses\Data\Usage;

class AiCostCalculator
{
    /**
     * Calculate the cost in USD for a text generation response.
     * Returns null if no pricing is configured for the model.
     */
    public static function forText(Meta $meta, Usage $usage): ?float
    {
        $pricing = self::pricing($meta);

        if ($pricing === null || ! isset($pricing['input_per_1m'], $pricing['output_per_1m'])) {
            return null;
        }

        return ($usage->promptTokens / 1_000_000 * $pricing['input_per_1m'])
            + ($usage->completionTokens / 1_000_000 * $pricing['output_per_1m']);
    }

    /**
     * Calculate the cost in USD for an image generation response.
     * Returns null if no pricing is configured for the model.
     */
    public static function forImage(Meta $meta, int $imageCount = 1): ?float
    {
        $pricing = self::pricing($meta);

        if ($pricing === null || ! isset($pricing['per_image'])) {
            return null;
        }

        return $pricing['per_image'] * $imageCount;
    }

    /**
     * Sum multiple nullable costs, returning null if none are known.
     */
    public static function sum(?float ...$costs): ?float
    {
        $known = array_filter($costs, fn (?float $cost) => $cost !== null);

        return $known !== [] ? array_sum($known) : null;
    }

    /**
     * @return array<string, float>|null
     */
    private static function pricing(Meta $meta): ?array
    {
        if ($meta->provider === null || $meta->model === null) {
            return null;
        }

        $pricing = config("ai.providers.{$meta->provider}.pricing");

        return is_array($pricing) ? ($pricing[$meta->model] ?? null) : null;
    }
}
