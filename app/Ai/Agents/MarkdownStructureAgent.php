<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\UseSmartestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

#[UseSmartestModel]
class MarkdownStructureAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'INSTRUCTIONS'
You are a markdown formatting expert. Given raw text content, reformat it as clean, well-structured markdown.
- Add appropriate headings (##, ###) based on the content's structure
- Format code snippets in fenced code blocks with the correct language tag
- Create bullet or numbered lists where appropriate
- Ensure proper paragraph spacing
- Preserve all the original information — do not add, remove, or summarize content
- Return only the formatted markdown, nothing else
INSTRUCTIONS;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'content' => $schema->string()->required(),
        ];
    }
}
