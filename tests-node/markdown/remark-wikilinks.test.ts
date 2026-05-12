import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkWikilinks } from '../../resources/js/lib/remark-wikilinks.ts';

test('remarkWikilinks converts wikilinks into markdown links', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'text',
                        value: 'See [[docs/intro]] and [[blog/post|this post]].',
                    },
                ],
            },
        ],
    };

    remarkWikilinks((path) => `/${path}`)(tree as never);

    assert.deepEqual(tree.children[0], {
        type: 'paragraph',
        children: [
            { type: 'text', value: 'See ' },
            {
                type: 'link',
                url: '/docs/intro',
                children: [{ type: 'text', value: 'intro' }],
            },
            { type: 'text', value: ' and ' },
            {
                type: 'link',
                url: '/blog/post',
                children: [{ type: 'text', value: 'this post' }],
            },
            { type: 'text', value: '.' },
        ],
    });
});
