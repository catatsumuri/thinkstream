import assert from 'node:assert/strict';
import test from 'node:test';
import { getMarkdownLinkPasteResult } from '../../resources/js/lib/markdown-link-paste.ts';

test('getMarkdownLinkPasteResult wraps the selected text in a markdown link', () => {
    assert.deepEqual(
        getMarkdownLinkPasteResult({
            currentValue: 'Read docs here.',
            pastedText: ' https://example.com/docs ',
            selectionStart: 5,
            selectionEnd: 9,
        }),
        {
            nextValue: 'Read [docs](https://example.com/docs) here.',
            nextSelectionStart: 37,
            nextSelectionEnd: 37,
        },
    );
});

test('getMarkdownLinkPasteResult ignores pastes without a selection', () => {
    assert.equal(
        getMarkdownLinkPasteResult({
            currentValue: 'Read docs here.',
            pastedText: 'https://example.com/docs',
            selectionStart: 5,
            selectionEnd: 5,
        }),
        null,
    );
});

test('getMarkdownLinkPasteResult ignores non-absolute urls', () => {
    assert.equal(
        getMarkdownLinkPasteResult({
            currentValue: 'Read docs here.',
            pastedText: '/docs/internal',
            selectionStart: 5,
            selectionEnd: 9,
        }),
        null,
    );
});
