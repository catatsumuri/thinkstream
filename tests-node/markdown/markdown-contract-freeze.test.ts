import assert from 'node:assert/strict';
import test from 'node:test';
import { renderMarkdownToHtml } from './markdown-pipeline.ts';

/**
 * Freezes the renderer's output contract for the syntax surface declared in
 * resources/js/lib/markdown-syntax-manifest.ts, including the intentionally
 * unsupported syntax listed in MARKDOWN_UNSUPPORTED_SYNTAX. Every expected
 * string below is real pipeline output; a failure here means the published
 * rendering contract changed (for example through a remark dependency
 * upgrade) and must be a deliberate decision.
 */

test('math delimiters render as literal text', () => {
    assert.equal(
        renderMarkdownToHtml('Euler: $e^{i\\pi}+1=0$'),
        '<p>Euler: $e^{i\\pi}+1=0$</p>',
    );

    assert.equal(
        renderMarkdownToHtml('$$\nE = mc^2\n$$'),
        '<p>$$\nE = mc^2\n$$</p>',
    );

    assert.equal(
        renderMarkdownToHtml('costs $5 or $10'),
        '<p>costs $5 or $10</p>',
    );
});

test('unknown container directives degrade to a plain div keeping their content', () => {
    assert.equal(
        renderMarkdownToHtml(':::foo\ncontent\n:::'),
        '<div><p>content</p></div>',
    );
});

test('unknown inline directives are restored as literal text', () => {
    assert.equal(
        renderMarkdownToHtml('Use :foo[bar] now'),
        '<p>Use :foo[bar] now</p>',
    );
});

test('GitHub alerts render as message asides', () => {
    assert.equal(
        renderMarkdownToHtml('> [!WARNING]\n> Careful'),
        '<aside class="msg alert">\n<p>Careful</p>\n</aside>',
    );
});

test('a GitHub alert marker followed by same-line text stays a blockquote', () => {
    assert.equal(
        renderMarkdownToHtml('> [!NOTE] same line'),
        '<blockquote>\n<p>[!NOTE] same line</p>\n</blockquote>',
    );
});

test('GitHub alerts and Zenn message directives share one aside contract', () => {
    const githubAlert = renderMarkdownToHtml('> [!CAUTION]\n> Careful');
    const zennMessage = renderMarkdownToHtml(':::message alert\nCareful\n:::');

    assert.equal(
        githubAlert,
        '<aside class="msg alert">\n<p>Careful</p>\n</aside>',
    );
    assert.equal(zennMessage, '<aside class="msg alert"><p>Careful</p></aside>');
});

test('raw HTML renders as escaped literal text', () => {
    assert.equal(
        renderMarkdownToHtml('<div class="x">hi</div>'),
        '&#x3C;div class="x">hi&#x3C;/div>',
    );

    assert.equal(
        renderMarkdownToHtml('a <b>c</b> d'),
        '<p>a &#x3C;b>c&#x3C;/b> d</p>',
    );
});

test('GFM footnotes render with the frozen reference and section markup', () => {
    assert.equal(
        renderMarkdownToHtml('Text[^1]\n\n[^1]: Note body'),
        '<p>Text<sup><a href="#user-content-fn-1" id="user-content-fnref-1" data-footnote-ref aria-describedby="footnote-label">1</a></sup></p>\n' +
            '<section data-footnotes class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>\n' +
            '<ol>\n' +
            '<li id="user-content-fn-1">\n' +
            '<p>Note body <a href="#user-content-fnref-1" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>\n' +
            '</li>\n' +
            '</ol>\n' +
            '</section>',
    );
});

test('leading frontmatter renders as plain markdown', () => {
    assert.equal(
        renderMarkdownToHtml('---\ntitle: x\n---\n\nBody'),
        '<hr>\n<h2>title: x</h2>\n<p>Body</p>',
    );
});
