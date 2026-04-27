<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

class SyncFileParser
{
    /**
     * Parse a sync file with YAML frontmatter + Markdown content.
     *
     * @return array{title: string|null, tags: string[], content: string}
     */
    public function parse(string $filePath): array
    {
        if (! is_file($filePath) || ! is_readable($filePath)) {
            throw new RuntimeException("Unable to read sync file [{$filePath}].");
        }

        $raw = file_get_contents($filePath);

        if ($raw === false) {
            throw new RuntimeException("Unable to read sync file [{$filePath}].");
        }

        if (! str_starts_with($raw, "---\n")) {
            return ['title' => null, 'tags' => [], 'content' => $raw];
        }

        $end = strpos($raw, "\n---\n", 4);

        if ($end === false) {
            return ['title' => null, 'tags' => [], 'content' => $raw];
        }

        $yamlBlock = substr($raw, 4, $end - 4);
        $content = ltrim(substr($raw, $end + 5));

        try {
            $frontmatter = Yaml::parse($yamlBlock);
        } catch (ParseException) {
            return ['title' => null, 'tags' => [], 'content' => $raw];
        }

        $title = isset($frontmatter['title']) ? (string) $frontmatter['title'] : null;
        $tags = isset($frontmatter['tags']) && is_array($frontmatter['tags'])
            ? array_values(array_filter(array_map('strval', $frontmatter['tags'])))
            : [];

        return ['title' => $title, 'tags' => $tags, 'content' => $content];
    }
}
