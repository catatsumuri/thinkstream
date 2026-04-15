import assert from 'node:assert/strict';
import test from 'node:test';
import {
    parseMarkdownImageMetadata,
    preprocessMarkdownContent,
    preprocessMarkdownSyntax,
} from '../../resources/js/lib/markdown-syntax.ts';

test('preprocessMarkdownSyntax normalizes Zenn shorthand and Mintlify tabs', () => {
    const output = preprocessMarkdownSyntax(`:::message alert
Watch out
:::

:::details More Info
Hidden content
:::

@[card](https://example.com)
@[github](https://github.com/owner/repo)

<Tabs sync={false} borderBottom={true}>
  <Tab title="npm" icon="package">
    \`\`\`bash
    npm install
    \`\`\`
  </Tab>
</Tabs>`);

    assert.match(output, /:::message\{\.alert\}/);
    assert.match(output, /:::details\[More Info\]/);
    assert.match(output, /^https:\/\/example\.com$/m);
    assert.match(output, /^https:\/\/github\.com\/owner\/repo$/m);
    assert.match(
        output,
        /::::tabs\{sync="false" borderBottom="true"\}/,
    );
    assert.match(output, /:::tab\{title="npm" icon="package"\}/);
});

test('preprocessMarkdownSyntax converts Mintlify CardGroup and Card to directive syntax', () => {
    const output = preprocessMarkdownSyntax(`<CardGroup cols={2}>
  <Card title="Tabs" icon="folder" href="/components/tabs">
    Organize related content.
  </Card>
  <Card title="Steps" icon="list-ordered" href="/components/steps" />
</CardGroup>`);

    assert.match(output, /::::cardgroup\{cols="2"\}/);
    assert.match(output, /:::card\{title="Tabs" icon="folder" href="\/components\/tabs"\}/);
    assert.match(output, /:::card\{title="Steps" icon="list-ordered" href="\/components\/steps"\}/);
});

test('preprocessMarkdownSyntax converts standalone Mintlify Card to directive syntax', () => {
    const output = preprocessMarkdownSyntax(`<Card title="Callouts" icon="message-square-warning" href="/components/callouts">
  Highlight important information with styled alerts.
</Card>`);

    assert.match(output, /:::card\{title="Callouts" icon="message-square-warning" href="\/components\/callouts"\}/);
});

test('preprocessMarkdownSyntax leaves Mintlify tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`\`mdx
<Tabs>
  <Tab title="npm">
    \`\`\`bash
    npm install
    \`\`\`
  </Tab>
</Tabs>
\`\`\`\``);

    assert.doesNotMatch(output, /::::tabs/);
    assert.match(output, /<Tabs>/);
    assert.match(output, /<Tab title="npm">/);
});

test('preprocessMarkdownContent encodes image metadata outside fences only', () => {
    const output = preprocessMarkdownContent(`![Guide cover](/storage/guide.png =250x)
*Guide cover image*

\`\`\`md
![Literal](/storage/literal.png =100x)
*Leave me alone*
\`\`\``);

    const encodedImage = output.match(/!\[Guide cover\]\((?<target>[^)]+)\)/);

    assert.ok(encodedImage?.groups?.target);

    const metadata = parseMarkdownImageMetadata(encodedImage.groups.target);

    assert.equal(metadata.src, '/storage/guide.png');
    assert.equal(metadata.width, 250);
    assert.equal(metadata.caption, 'Guide cover image');

    assert.match(output, /!\[Literal\]\(\/storage\/literal\.png =100x\)/);
    assert.match(output, /\*Leave me alone\*/);
});

test('parseMarkdownImageMetadata decodes absolute URLs and strips helper params', () => {
    const metadata = parseMarkdownImageMetadata(
        'https://example.com/image.png?__markdown_width=320&__markdown_height=180&__markdown_caption=Hero+image&fit=cover',
    );

    assert.deepEqual(metadata, {
        src: 'https://example.com/image.png?fit=cover',
        width: 320,
        height: 180,
        caption: 'Hero image',
    });
});
