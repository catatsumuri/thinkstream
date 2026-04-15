import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkCardDirective } from '../../resources/js/lib/remark-card-directive.ts';

test('remarkCardDirective maps cardgroup directive to renderable node', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'cardgroup',
                attributes: { cols: '2' },
                children: [
                    {
                        type: 'containerDirective',
                        name: 'card',
                        attributes: {
                            title: 'Tabs',
                            icon: 'folder',
                            href: '/components/tabs',
                        },
                        children: [],
                    },
                ],
            },
        ],
    };

    remarkCardDirective()(tree as never);

    const groupNode = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
        children: Array<{
            data?: { hName?: string; hProperties?: Record<string, unknown> };
        }>;
    };
    const cardNode = groupNode.children[0];

    assert.equal(groupNode.data?.hName, 'cardgroup');
    assert.deepEqual(groupNode.data?.hProperties, {
        'data-card-group-cols': '2',
    });

    assert.equal(cardNode.data?.hName, 'card');
    assert.deepEqual(cardNode.data?.hProperties, {
        'data-card-title': 'Tabs',
        'data-card-icon': 'folder',
        'data-card-href': '/components/tabs',
    });
});

test('remarkCardDirective maps standalone card directive', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'card',
                attributes: {
                    title: 'Callouts',
                    icon: 'message-square-warning',
                    href: '/components/callouts',
                },
                children: [],
            },
        ],
    };

    remarkCardDirective()(tree as never);

    const cardNode = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    };

    assert.equal(cardNode.data?.hName, 'card');
    assert.deepEqual(cardNode.data?.hProperties, {
        'data-card-title': 'Callouts',
        'data-card-icon': 'message-square-warning',
        'data-card-href': '/components/callouts',
    });
});

test('remarkCardDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'tabs',
                attributes: {},
                children: [],
            },
        ],
    };

    remarkCardDirective()(tree as never);

    assert.equal(
        (tree.children[0] as { data?: unknown }).data,
        undefined,
    );
});
