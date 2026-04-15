import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkStepsDirective } from '../../resources/js/lib/remark-steps-directive.ts';

test('remarkStepsDirective maps steps and step directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'steps',
                attributes: {},
                children: [
                    {
                        type: 'containerDirective',
                        name: 'step',
                        attributes: {
                            title: 'Create a file',
                            icon: 'file',
                        },
                        children: [],
                    },
                ],
            },
        ],
    };

    remarkStepsDirective()(tree as never);

    const stepsNode = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
        children: Array<{
            data?: { hName?: string; hProperties?: Record<string, unknown> };
        }>;
    };
    const stepNode = stepsNode.children[0];

    assert.equal(stepsNode.data?.hName, 'steps');
    assert.deepEqual(stepsNode.data?.hProperties, {});

    assert.equal(stepNode.data?.hName, 'step');
    assert.deepEqual(stepNode.data?.hProperties, {
        'data-step-title': 'Create a file',
        'data-step-icon': 'file',
    });
});

test('remarkStepsDirective ignores unrelated directives', () => {
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

    remarkStepsDirective()(tree as never);

    assert.equal(
        (tree.children[0] as { data?: unknown }).data,
        undefined,
    );
});
