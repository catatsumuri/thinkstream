import assert from 'node:assert/strict';
import test from 'node:test';
import { GITHUB_ALERT_VARIANTS } from '../../resources/js/lib/markdown-syntax-manifest.ts';
import { remarkGithubAlerts } from '../../resources/js/lib/remark-github-alerts.ts';

interface TestNode {
    type: string;
    value?: string;
    children?: TestNode[];
    data?: { hName?: string; hProperties?: Record<string, unknown> };
}

function blockquote(children: TestNode[]): TestNode {
    return { type: 'blockquote', children };
}

function paragraph(children: TestNode[]): TestNode {
    return { type: 'paragraph', children };
}

function text(value: string): TestNode {
    return { type: 'text', value };
}

function root(children: TestNode[]): TestNode {
    return { type: 'root', children };
}

function run(tree: TestNode): void {
    remarkGithubAlerts()(tree as never);
}

test('remarkGithubAlerts converts a marker with a soft-break body', () => {
    const node = blockquote([paragraph([text('[!NOTE]\nBody')])]);
    const tree = root([node]);

    run(tree);

    assert.equal(node.data?.hName, 'aside');
    assert.deepEqual(node.data?.hProperties, { className: 'msg note' });
    assert.equal(node.children?.[0]?.children?.[0]?.value, 'Body');
});

test('remarkGithubAlerts maps every GitHub marker to its manifest variant', () => {
    for (const [marker, variant] of Object.entries(GITHUB_ALERT_VARIANTS)) {
        const node = blockquote([paragraph([text(`[!${marker}]\nBody`)])]);

        run(root([node]));

        assert.deepEqual(
            node.data?.hProperties,
            { className: `msg ${variant}` },
            `marker ${marker}`,
        );
    }
});

test('remarkGithubAlerts accepts lowercase markers', () => {
    const node = blockquote([paragraph([text('[!note]\nBody')])]);

    run(root([node]));

    assert.deepEqual(node.data?.hProperties, { className: 'msg note' });
});

test('remarkGithubAlerts drops a marker-only first paragraph', () => {
    const node = blockquote([
        paragraph([text('[!TIP]')]),
        paragraph([text('Body')]),
    ]);

    run(root([node]));

    assert.equal(node.data?.hName, 'aside');
    assert.equal(node.children?.length, 1);
    assert.equal(node.children?.[0]?.children?.[0]?.value, 'Body');
});

test('remarkGithubAlerts strips a hard break following the marker', () => {
    const node = blockquote([
        paragraph([text('[!WARNING]'), { type: 'break' }, text('Body')]),
    ]);

    run(root([node]));

    assert.equal(node.data?.hName, 'aside');
    assert.deepEqual(node.children?.[0]?.children, [
        { type: 'text', value: 'Body' },
    ]);
});

test('remarkGithubAlerts ignores a marker followed by text on the same line', () => {
    const node = blockquote([paragraph([text('[!NOTE] same-line text')])]);

    run(root([node]));

    assert.equal(node.data, undefined);
});

test('remarkGithubAlerts ignores unknown alert types', () => {
    const node = blockquote([paragraph([text('[!FOO]\nBody')])]);

    run(root([node]));

    assert.equal(node.data, undefined);
});

test('remarkGithubAlerts ignores a first inline child that is not text', () => {
    const node = blockquote([
        paragraph([
            { type: 'strong', children: [text('[!NOTE]')] },
            text('\nBody'),
        ]),
    ]);

    run(root([node]));

    assert.equal(node.data, undefined);
});

test('remarkGithubAlerts ignores blockquotes without a leading paragraph', () => {
    const listFirst = blockquote([
        { type: 'list', children: [] },
        paragraph([text('[!NOTE]\nBody')]),
    ]);
    const empty = blockquote([]);

    run(root([listFirst, empty]));

    assert.equal(listFirst.data, undefined);
    assert.equal(empty.data, undefined);
});

test('remarkGithubAlerts converts a marker with no body into an empty aside', () => {
    const node = blockquote([paragraph([text('[!NOTE]')])]);

    run(root([node]));

    assert.equal(node.data?.hName, 'aside');
    assert.deepEqual(node.children, []);
});

test('remarkGithubAlerts converts nested alerts independently', () => {
    const inner = blockquote([paragraph([text('[!CAUTION]\nInner')])]);
    const plainInner = blockquote([paragraph([text('Just a quote')])]);
    const outer = blockquote([
        paragraph([text('[!NOTE]\nOuter')]),
        inner,
        plainInner,
    ]);

    run(root([outer]));

    assert.deepEqual(outer.data?.hProperties, { className: 'msg note' });
    assert.deepEqual(inner.data?.hProperties, { className: 'msg alert' });
    assert.equal(plainInner.data, undefined);
});

test('remarkGithubAlerts skips blockquotes already claimed by another plugin', () => {
    const node = blockquote([paragraph([text('[!NOTE]\nBody')])]);
    node.data = { hName: 'div' };

    run(root([node]));

    assert.equal(node.data.hName, 'div');
    assert.equal(node.children?.[0]?.children?.[0]?.value, '[!NOTE]\nBody');
});
