<?php

use App\Support\AiCostCalculator;
use Laravel\Ai\Responses\Data\Meta;
use Laravel\Ai\Responses\Data\Usage;
use Tests\TestCase;

uses(TestCase::class);

test('it calculates text costs from configured pricing', function () {
    $cost = AiCostCalculator::forText(
        new Meta('bedrock', 'us.anthropic.claude-haiku-4-5-20251001-v1:0'),
        new Usage(promptTokens: 2_000, completionTokens: 1_000),
    );

    expect($cost)->toEqualWithDelta(0.00175, 0.000001);
});

test('it calculates image costs from configured pricing', function () {
    $cost = AiCostCalculator::forImage(
        new Meta('bedrock', 'amazon.nova-canvas-v1:0'),
        imageCount: 3,
    );

    expect($cost)->toEqualWithDelta(0.12, 0.000001);
});

test('it returns null when pricing is unavailable and sums only known costs', function () {
    $unknownTextCost = AiCostCalculator::forText(
        new Meta('bedrock', 'unknown-model'),
        new Usage(promptTokens: 1_000, completionTokens: 1_000),
    );

    $knownImageCost = AiCostCalculator::forImage(
        new Meta('bedrock', 'amazon.nova-canvas-v1:0'),
    );

    expect($unknownTextCost)->toBeNull()
        ->and(AiCostCalculator::sum($unknownTextCost, $knownImageCost))->toEqualWithDelta(0.04, 0.000001)
        ->and(AiCostCalculator::sum(null, null))->toBeNull();
});
