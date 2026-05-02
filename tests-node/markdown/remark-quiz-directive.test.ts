import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkQuizDirective } from '../../resources/js/lib/remark-quiz-directive.ts';

test('remarkQuizDirective maps quiz container directives to renderable nodes', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'quiz',
                children: [
                    {
                        type: 'code',
                        lang: 'json',
                        value: '{"question":"Example","correct":"A","options":[{"label":"A","text":"One"},{"label":"B","text":"Two"}]}',
                    },
                ],
            },
        ],
    };

    remarkQuizDirective()(tree as never);

    const directiveNode = tree.children[0] as {
        data?: {
            hName?: string;
            hProperties?: Record<string, unknown>;
        };
    };

    assert.equal(directiveNode.data?.hName, 'div');
    assert.deepEqual(directiveNode.data?.hProperties, {
        'data-quiz':
            '{"question":"Example","correct":"A","options":[{"label":"A","text":"One"},{"label":"B","text":"Two"}]}',
    });
});

test('remarkQuizDirective falls back to an empty object payload when code payload is missing', () => {
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

    remarkQuizDirective()(tree as never);

    const directiveNode = tree.children[0] as {
        data?: {
            hProperties?: Record<string, unknown>;
        };
    };

    assert.deepEqual(directiveNode.data?.hProperties, {
        'data-quiz': '{}',
    });
});

test('remarkQuizDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'tree',
                children: [],
            },
        ],
    };

    remarkQuizDirective()(tree as never);

    const directiveNode = tree.children[0] as {
        data?: unknown;
    };

    assert.equal(directiveNode.data, undefined);
});
