import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkChartDirective } from '../../resources/js/lib/remark-chart-directive.ts';

test('remarkChartDirective maps chart container directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'chart',
                children: [
                    {
                        type: 'code',
                        lang: 'json',
                        value: '{"type":"bar","data":[{"label":"Juniper","value":9}]}',
                    },
                ],
            },
        ],
    };

    remarkChartDirective()(tree as never);

    const directiveNode = tree.children[0] as {
        data?: {
            hName?: string;
            hProperties?: Record<string, unknown>;
        };
    };

    assert.equal(directiveNode.data?.hName, 'div');
    assert.deepEqual(directiveNode.data?.hProperties, {
        'data-chart': '{"type":"bar","data":[{"label":"Juniper","value":9}]}',
    });
});

test('remarkChartDirective falls back to an empty object payload when code payload is missing', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'chart',
                children: [],
            },
        ],
    };

    remarkChartDirective()(tree as never);

    const directiveNode = tree.children[0] as {
        data?: {
            hProperties?: Record<string, unknown>;
        };
    };

    assert.deepEqual(directiveNode.data?.hProperties, {
        'data-chart': '{}',
    });
});

test('remarkChartDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'quiz',
                children: [],
            },
        ],
    };

    remarkChartDirective()(tree as never);

    const directiveNode = tree.children[0] as {
        data?: unknown;
    };

    assert.equal(directiveNode.data, undefined);
});
