import assert from 'node:assert/strict';
import test from 'node:test';
import { remarkCodeGroupDirective } from '../../resources/js/lib/remark-code-group-directive.ts';

test('remarkCodeGroupDirective maps codegroup directive to renderable node', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'codegroup',
                children: [
                    {
                        type: 'code',
                        lang: 'javascript',
                        meta: 'JavaScript',
                        value: 'const x = 1;',
                    },
                    {
                        type: 'code',
                        lang: 'python',
                        meta: 'Python',
                        value: 'x = 1',
                    },
                ],
            },
        ],
    };

    remarkCodeGroupDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hName?: string; hProperties?: Record<string, unknown> };
    };

    assert.equal(node.data?.hName, 'codegroup');

    const tabs = JSON.parse(
        node.data?.hProperties?.['data-codegroup-tabs'] as string,
    ) as {
        lang: string;
        title: string;
        index: number;
        meta?: string | null;
        value: string;
    }[];

    assert.equal(tabs.length, 2);
    assert.deepEqual(tabs[0], {
        lang: 'javascript',
        title: 'JavaScript',
        index: 0,
        meta: 'JavaScript',
        value: 'const x = 1;',
    });
    assert.deepEqual(tabs[1], {
        lang: 'python',
        title: 'Python',
        index: 1,
        meta: 'Python',
        value: 'x = 1',
    });
});

test('remarkCodeGroupDirective falls back to capitalized lang when meta is absent', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'codegroup',
                children: [
                    {
                        type: 'code',
                        lang: 'bash',
                        meta: null,
                        value: 'npm install',
                    },
                ],
            },
        ],
    };

    remarkCodeGroupDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hProperties?: Record<string, unknown> };
    };

    const tabs = JSON.parse(
        node.data?.hProperties?.['data-codegroup-tabs'] as string,
    ) as { title: string; meta?: string | null; value: string }[];

    assert.equal(tabs[0]?.title, 'Bash');
    assert.equal(tabs[0]?.meta, null);
    assert.equal(tabs[0]?.value, 'npm install');
});

test('remarkCodeGroupDirective ignores non-code children', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'codegroup',
                children: [
                    { type: 'paragraph', children: [] },
                    {
                        type: 'code',
                        lang: 'ts',
                        meta: 'TypeScript',
                        value: 'const x: number = 1;',
                    },
                ],
            },
        ],
    };

    remarkCodeGroupDirective()(tree as never);

    const node = tree.children[0] as {
        data?: { hProperties?: Record<string, unknown> };
    };

    const tabs = JSON.parse(
        node.data?.hProperties?.['data-codegroup-tabs'] as string,
    ) as { lang: string; title: string; index: number }[];

    assert.equal(tabs.length, 1);
    assert.equal(tabs[0]?.index, 0);
});

test('remarkCodeGroupDirective ignores unrelated directives', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'containerDirective',
                name: 'tabs',
                children: [],
            },
        ],
    };

    remarkCodeGroupDirective()(tree as never);

    assert.equal((tree.children[0] as { data?: unknown }).data, undefined);
});
