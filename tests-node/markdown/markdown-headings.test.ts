import assert from 'node:assert/strict';
import test from 'node:test';
import { extractMarkdownHeadings } from '../../resources/js/lib/markdown-headings.ts';

test('extractMarkdownHeadings deduplicates repeated formatted headings', () => {
    const headings = extractMarkdownHeadings(
        `# Intro

## The \`foo_bar\` Guide

## The \`foo_bar\` [Guide](https://example.com/docs)`,
        'duplicate-headings',
    );

    assert.deepEqual(headings, [
        {
            level: 1,
            text: 'Intro',
            id: 'duplicate-headings-intro',
        },
        {
            level: 2,
            text: 'The `foo_bar` Guide',
            id: 'duplicate-headings-the-foo-bar-guide',
        },
        {
            level: 2,
            text: 'The `foo_bar` Guide',
            id: 'duplicate-headings-the-foo-bar-guide-2',
        },
    ]);
});

test('extractMarkdownHeadings ignores headings inside longer fenced code blocks', () => {
    const headings = extractMarkdownHeadings(
        `## Installation

\`\`\`\`md
## Installation
\`\`\`\`

## Installation`,
        'install',
    );

    assert.deepEqual(headings.map((heading) => heading.id), [
        'install-installation',
        'install-installation-2',
    ]);
});
