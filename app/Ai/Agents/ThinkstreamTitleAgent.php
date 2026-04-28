<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\UseSmartestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

#[UseSmartestModel]
class ThinkstreamTitleAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'INSTRUCTIONS'
You are naming a private idea canvas.

You will receive the current canvas title and the canvas thoughts.

Your task:
- Propose a better title that captures the main theme clearly
- Keep it concise, specific, and natural
- Prefer 3 to 8 words
- Do not use quotation marks
- Do not add emojis, prefixes, or explanations
- Preserve the author's language and tone when possible
- Return only the improved title
INSTRUCTIONS;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->required(),
        ];
    }
}
