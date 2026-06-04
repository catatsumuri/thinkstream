import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkAccordionGroupDirective } from '../../resources/js/lib/remark-accordion-group-directive.ts';

test('remarkAccordionGroupDirective maps accordion-group directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'accordion-group',
                attributes: {},
                children: [],
            },
        ],
    };

    remarkAccordionGroupDirective()(tree as never);

    const groupNode = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    };

    assert.equal(groupNode.data?.hName, 'accordion-group');
    assert.deepEqual(groupNode.data?.hProperties, {});
});

test('remarkAccordionGroupDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'steps',
                attributes: {},
                children: [],
            },
        ],
    };

    remarkAccordionGroupDirective()(tree as never);

    assert.equal(
        (tree.children[0] as { data?: unknown }).data,
        undefined,
    );
});
