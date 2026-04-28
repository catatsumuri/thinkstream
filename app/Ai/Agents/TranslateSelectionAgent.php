<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\UseSmartestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

#[UseSmartestModel]
class TranslateSelectionAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function __construct(private readonly string $targetLanguage) {}

    public function instructions(): Stringable|string
    {
        return "You are a professional translator. Translate the given markdown text to {$this->targetLanguage}, preserving all markdown formatting (headings, lists, code blocks, links, emphasis, etc.). Return only the translated markdown, nothing else.";
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'content' => $schema->string()->required(),
        ];
    }
}
