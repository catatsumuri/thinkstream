import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import {
    extractRenderedHeadingText,
    normalizeMarkdownHeadingText,
} from '../../resources/js/lib/markdown-heading-text.ts';
import { slugify } from '../../resources/js/lib/slugify.ts';

test('slugify converts underscores into dashes while preserving unicode letters', () => {
    assert.equal(slugify('The `foo_bar` Method'), 'the-foo-bar-method');
    assert.equal(slugify('snake_case Naming'), 'snake-case-naming');
    assert.equal(slugify('日本語 foo_bar'), '日本語-foo-bar');
});

test('slugify trims repeated separators', () => {
    assert.equal(slugify('  already---slugged__value  '), 'already-slugged-value');
    assert.equal(slugify('---'), '');
});

test('markdown heading text normalization matches rendered heading text', () => {
    const sourceText = normalizeMarkdownHeadingText(
        'The `foo_bar` [Guide](https://example.com/docs)',
    );
    const renderedText = extractRenderedHeadingText([
        'The ',
        createElement('code', {}, 'foo_bar'),
        ' ',
        createElement('a', { href: 'https://example.com/docs' }, 'Guide'),
    ]);

    assert.equal(slugify(sourceText), 'the-foo-bar-guide');
    assert.equal(slugify(renderedText), 'the-foo-bar-guide');
});
