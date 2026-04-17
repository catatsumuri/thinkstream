import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkBadgeDirective } from '../../resources/js/lib/remark-badge-directive.ts';

test('remarkBadgeDirective maps badge text directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'textDirective',
                        name: 'badge',
                        attributes: {
                            color: 'green',
                            size: 'sm',
                            shape: 'pill',
                            icon: 'circle-check',
                            stroke: 'false',
                            disabled: 'false',
                        },
                        children: [{ type: 'text', value: 'Stable' }],
                    },
                ],
            },
        ],
    };

    remarkBadgeDirective()(tree as never);

    const node = (tree.children[0] as { children: Array<{
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    }> }).children[0];

    assert.equal(node.data?.hName, 'badge');
    assert.deepEqual(node.data?.hProperties, {
        'data-badge-color': 'green',
        'data-badge-size': 'sm',
        'data-badge-shape': 'pill',
        'data-badge-icon': 'circle-check',
        'data-badge-stroke': 'false',
        'data-badge-disabled': 'false',
    });
});

test('remarkBadgeDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'textDirective',
                        name: 'tip',
                        attributes: {},
                        children: [{ type: 'text', value: 'Ignore me' }],
                    },
                ],
            },
        ],
    };

    remarkBadgeDirective()(tree as never);

    const node = (tree.children[0] as { children: Array<{ data?: unknown }> })
        .children[0];

    assert.equal(node.data, undefined);
});
