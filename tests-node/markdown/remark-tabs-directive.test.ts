import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkTabsDirective } from '../../resources/js/lib/remark-tabs-directive.ts';

test('remarkTabsDirective maps tabs and tab directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'tabs',
                attributes: {
                    sync: 'false',
                    borderBottom: 'true',
                },
                children: [
                    {
                        type: 'containerDirective',
                        name: 'tab',
                        attributes: {
                            title: 'npm',
                            icon: 'package',
                        },
                        children: [],
                    },
                ],
            },
        ],
    };

    remarkTabsDirective()(tree as never);

    const tabsNode = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
        children: Array<{
            data?: { hName?: string; hProperties?: Record<string, unknown> };
        }>;
    };
    const tabNode = tabsNode.children[0];

    assert.equal(tabsNode.data?.hName, 'tabs');
    assert.deepEqual(tabsNode.data?.hProperties, {
        'data-tabs-sync': 'false',
        'data-tabs-border-bottom': 'true',
    });

    assert.equal(tabNode.data?.hName, 'tab');
    assert.deepEqual(tabNode.data?.hProperties, {
        'data-tab-title': 'npm',
        'data-tab-icon': 'package',
    });
});

test('remarkTabsDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'message',
                attributes: {
                    className: 'alert',
                },
                children: [],
            },
        ],
    };

    remarkTabsDirective()(tree as never);

    assert.equal(
        (tree.children[0] as { data?: unknown }).data,
        undefined,
    );
});
