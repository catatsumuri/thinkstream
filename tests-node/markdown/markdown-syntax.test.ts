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

:::message note
Take note
:::

:::message tip
Pro tip
:::

:::message check
All done
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
    assert.match(output, /:::message\{\.note\}/);
    assert.match(output, /:::message\{\.tip\}/);
    assert.match(output, /:::message\{\.check\}/);
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

test('preprocessMarkdownSyntax converts Mintlify callout tags to message directives', () => {
    const output = preprocessMarkdownSyntax(`<Note>
  This is a note.
</Note>

<Tip>
  This is a tip.
</Tip>

<Info>
  This is info.
</Info>

<Warning>
  This is a warning.
</Warning>

<Check>
  This is a check.
</Check>`);

    assert.match(output, /:::message\{\.note\}/);
    assert.match(output, /:::message\{\.tip\}/);
    assert.match(output, /:::message\n/);
    assert.match(output, /:::message\{\.alert\}/);
    assert.match(output, /:::message\{\.check\}/);
});

test('preprocessMarkdownSyntax leaves Mintlify callout tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<Note>This is a note.</Note>
<Warning>This is a warning.</Warning>
\`\`\``);

    assert.doesNotMatch(output, /:::message/);
    assert.match(output, /<Note>/);
    assert.match(output, /<Warning>/);
});

test('preprocessMarkdownSyntax leaves Mintlify Tabs tags untouched inside fenced code blocks', () => {
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

test('preprocessMarkdownSyntax leaves inline code literals untouched', () => {
    const output = preprocessMarkdownSyntax(
        'Use `:::message alert`, `:::details More Info`, `@[card](https://example.com)`, and `@[github](https://github.com/owner/repo)` literally.',
    );

    assert.match(output, /`:::message alert`/);
    assert.match(output, /`:::details More Info`/);
    assert.match(output, /`@\[card\]\(https:\/\/example\.com\)`/);
    assert.match(
        output,
        /`@\[github\]\(https:\/\/github\.com\/owner\/repo\)`/,
    );
    assert.doesNotMatch(output, /:::message\{\.alert\}/);
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
