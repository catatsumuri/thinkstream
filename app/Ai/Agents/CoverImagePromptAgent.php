<?php

namespace App\Ai\Agents;

use Laravel\Ai\Attributes\UseCheapestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;
use Stringable;

#[UseCheapestModel]
class CoverImagePromptAgent implements Agent
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return 'You are a documentation assistant. Given metadata about a documentation section (which may be in any language), write a concise English description in 1-2 sentences that captures the conceptual theme, suitable for use in an image generation prompt. Return only the description, nothing else.';
    }
}
