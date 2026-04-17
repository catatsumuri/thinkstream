import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkTreeDirective } from '../../resources/js/lib/remark-tree-directive.ts';

test('remarkTreeDirective maps tree container directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'tree',
                children: [
                    {
                        type: 'code',
                        lang: 'json',
                        value: '[{"type":"file","name":"package.json"}]',
                    },
                ],
            },
        ],
    };

    remarkTreeDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    };

    assert.equal(node.data?.hName, 'tree');
    assert.deepEqual(node.data?.hProperties, {
        'data-tree': '[{"type":"file","name":"package.json"}]',
    });
});

test('remarkTreeDirective falls back to an empty tree when code payload is missing', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'tree',
                children: [{ type: 'paragraph', children: [] }],
            },
        ],
    };

    remarkTreeDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hProperties?: Record<string, unknown> };
    };

    assert.equal(node.data?.hProperties?.['data-tree'], '[]');
});

test('remarkTreeDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'update',
                children: [],
            },
        ],
    };

    remarkTreeDirective()(tree as never);

    assert.equal((tree.children[0] as { data?: unknown }).data, undefined);
});
