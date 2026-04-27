import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkFixUrlPorts } from '../../resources/js/lib/remark-fix-url-ports.ts';

test('remarkFixUrlPorts restores port-like text directives to plain text', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    { type: 'text', value: 'http://localhost' },
                    { type: 'textDirective', name: '8000', attributes: {}, children: [] },
                    { type: 'text', value: '/docs' },
                ],
            },
        ],
    };

    remarkFixUrlPorts()(tree as never);

    assert.deepEqual(tree.children[0], {
        type: 'paragraph',
        children: [
            { type: 'text', value: 'http://localhost' },
            { type: 'text', value: ':8000' },
            { type: 'text', value: '/docs' },
        ],
    });
});

test('remarkFixUrlPorts leaves non-port directives unchanged', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    { type: 'textDirective', name: 'note', attributes: {}, children: [] },
                    { type: 'textDirective', name: '8080', attributes: {}, children: [{ type: 'text', value: 'x' }] },
                ],
            },
        ],
    };

    remarkFixUrlPorts()(tree as never);

    assert.deepEqual(tree.children[0], {
        type: 'paragraph',
        children: [
            { type: 'textDirective', name: 'note', attributes: {}, children: [] },
            { type: 'textDirective', name: '8080', attributes: {}, children: [{ type: 'text', value: 'x' }] },
        ],
    });
});
