import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkUpdateDirective } from '../../resources/js/lib/remark-update-directive.ts';

test('remarkUpdateDirective maps update container directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'update',
                attributes: {
                    label: '2024-10-11',
                    description: 'v0.2.0',
                    tags: 'Feature,Improvement',
                },
                children: [],
            },
        ],
    };

    remarkUpdateDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    };

    assert.equal(node.data?.hName, 'update');
    assert.deepEqual(node.data?.hProperties, {
        'data-update-label': '2024-10-11',
        'data-update-description': 'v0.2.0',
        'data-update-tags': 'Feature,Improvement',
    });
});

test('remarkUpdateDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'badge',
                attributes: {},
                children: [],
            },
        ],
    };

    remarkUpdateDirective()(tree as never);

    assert.equal(
        (tree.children[0] as { data?: unknown }).data,
        undefined,
    );
});
