<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\UseSmartestModel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Promptable;
use Stringable;

#[UseSmartestModel]
class ThinkstreamStructureAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): Stringable|string
    {
        return <<<'INSTRUCTIONS'
You are an expert editor. You will receive a canvas title and a collection of raw, informal thought entries separated by "---".

Your task is to proofread and restructure them into a single, coherent, well-formatted markdown document, and propose a Scrap title:
- Fix grammar, spelling, punctuation, and awkward phrasing
- Organise the content with appropriate markdown headings (##, ###), lists, and code blocks
- Merge related ideas naturally; remove redundancy
- PRESERVE the author's original tone, voice, and personality — do not sanitise or make it sound formal if it wasn't
- Do not add new information or opinions not present in the source
- For the title, inherit the canvas title as much as possible while making it work as a concise Scrap note title
- Keep the title natural and specific, not generic
- Do not include a top-level `#` heading that simply repeats the title, since the Scrap note title is stored separately
- Return structured output only
INSTRUCTIONS;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->required(),
            'content' => $schema->string()->required(),
        ];
    }
}
