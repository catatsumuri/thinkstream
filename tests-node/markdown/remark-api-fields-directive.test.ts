import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkApiFieldsDirective } from '../../resources/js/lib/remark-api-fields-directive.ts';

test('remarkApiFieldsDirective maps responsefield directive to renderable node', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'responsefield',
                attributes: {
                    name: 'id',
                    type: 'string',
                    required: 'true',
                    deprecated: 'false',
                    default: undefined,
                },
                children: [],
            },
        ],
    };

    remarkApiFieldsDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    };

    assert.equal(node.data?.hName, 'responsefield');
    assert.deepEqual(node.data?.hProperties, {
        'data-field-name': 'id',
        'data-field-type': 'string',
        'data-field-required': 'true',
        'data-field-default': undefined,
        'data-field-deprecated': 'false',
    });
});

test('remarkApiFieldsDirective maps paramfield directive to renderable node', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'paramfield',
                attributes: {
                    path: 'slug',
                    type: 'string',
                    required: 'true',
                    default: 'author',
                    deprecated: 'true',
                },
                children: [],
            },
        ],
    };

    remarkApiFieldsDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    };

    assert.equal(node.data?.hName, 'paramfield');
    assert.deepEqual(node.data?.hProperties, {
        'data-field-name': undefined,
        'data-field-type': 'string',
        'data-field-required': 'true',
        'data-field-default': 'author',
        'data-field-deprecated': 'true',
        'data-field-path': 'slug',
        'data-field-query': undefined,
        'data-field-body': undefined,
    });
});

test('remarkApiFieldsDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'message',
                attributes: { className: 'alert' },
                children: [],
            },
        ],
    };

    remarkApiFieldsDirective()(tree as never);

    assert.equal((tree.children[0] as { data?: unknown }).data, undefined);
});
