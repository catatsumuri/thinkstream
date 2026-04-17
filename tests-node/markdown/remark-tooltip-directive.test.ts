import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkTooltipDirective } from '../../resources/js/lib/remark-tooltip-directive.ts';

test('remarkTooltipDirective maps tooltip text directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'textDirective',
                        name: 'tooltip',
                        attributes: {
                            tip: 'Application Programming Interface',
                            headline: 'API',
                            cta: 'Read more',
                            href: '/guides/index',
                        },
                        children: [{ type: 'text', value: 'API' }],
                    },
                ],
            },
        ],
    };

    remarkTooltipDirective()(tree as never);

    const node = (tree.children[0] as {
        children: Array<{
            data?: { hName?: string; hProperties?: Record<string, unknown> };
        }>;
    }).children[0];

    assert.equal(node.data?.hName, 'tooltip');
    assert.deepEqual(node.data?.hProperties, {
        'data-tooltip-tip': 'Application Programming Interface',
        'data-tooltip-headline': 'API',
        'data-tooltip-cta': 'Read more',
        'data-tooltip-href': '/guides/index',
    });
});

test('remarkTooltipDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'textDirective',
                        name: 'badge',
                        attributes: {},
                        children: [{ type: 'text', value: 'Ignore me' }],
                    },
                ],
            },
        ],
    };

    remarkTooltipDirective()(tree as never);

    const node = (tree.children[0] as { children: Array<{ data?: unknown }> })
        .children[0];

    assert.equal(node.data, undefined);
});
