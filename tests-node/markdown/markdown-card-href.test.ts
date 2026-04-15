import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeMarkdownCardHref } from '../../resources/js/lib/markdown-card-href.ts';

test('sanitizeMarkdownCardHref preserves safe URLs', () => {
    assert.equal(sanitizeMarkdownCardHref('/guides/index'), '/guides/index');
    assert.equal(
        sanitizeMarkdownCardHref('https://example.com/docs/cards'),
        'https://example.com/docs/cards',
    );
});

test('sanitizeMarkdownCardHref removes unsafe URLs', () => {
    assert.equal(
        sanitizeMarkdownCardHref('javascript:alert("xss")'),
        undefined,
    );
    assert.equal(
        sanitizeMarkdownCardHref('data:text/html,<script>alert(1)</script>'),
        undefined,
    );
});
