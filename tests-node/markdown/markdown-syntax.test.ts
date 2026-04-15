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
    assert.match(output, /::::tabs\{sync="false" borderBottom="true"\}/);
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
    assert.match(
        output,
        /:::card\{title="Tabs" icon="folder" href="\/components\/tabs"\}/,
    );
    assert.match(
        output,
        /:::card\{title="Steps" icon="list-ordered" href="\/components\/steps"\}/,
    );
});

test('preprocessMarkdownSyntax converts standalone Mintlify Card to directive syntax', () => {
    const output =
        preprocessMarkdownSyntax(`<Card title="Callouts" icon="message-square-warning" href="/components/callouts">
  Highlight important information with styled alerts.
</Card>`);

    assert.match(
        output,
        /:::card\{title="Callouts" icon="message-square-warning" href="\/components\/callouts"\}/,
    );
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
    assert.match(output, /`@\[github\]\(https:\/\/github\.com\/owner\/repo\)`/);
    assert.doesNotMatch(output, /:::message\{\.alert\}/);
});

test('preprocessMarkdownSyntax converts Mintlify Accordion to details directive', () => {
    const output =
        preprocessMarkdownSyntax(`<Accordion title="What is Mintlify?">
  Mintlify is a documentation platform.
</Accordion>

<Accordion title="How do I get started?" icon="rocket">
  Follow our quickstart guide.
</Accordion>`);

    assert.match(output, /:::details\[What is Mintlify\?\]/);
    assert.match(output, /:::details\[How do I get started\?\]/);
    assert.match(output, /Mintlify is a documentation platform\./);
    assert.match(output, /Follow our quickstart guide\./);
});

test('preprocessMarkdownSyntax converts Mintlify Steps/Step to directive syntax', () => {
    const output = preprocessMarkdownSyntax(`<Steps>
  <Step title="Create a file">
    Create a new MDX file in your docs directory.
  </Step>
  <Step title="Add frontmatter">
    Add YAML frontmatter with title and description.
  </Step>
</Steps>`);

    assert.match(output, /::::steps/);
    assert.match(output, /:::step\{title="Create a file"\}/);
    assert.match(output, /:::step\{title="Add frontmatter"\}/);
    assert.match(output, /Create a new MDX file/);
    assert.match(output, /Add YAML frontmatter/);
});

test('preprocessMarkdownSyntax leaves Steps tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<Steps>
  <Step title="Create a file">
    Create a new MDX file.
  </Step>
</Steps>
\`\`\``);

    assert.doesNotMatch(output, /::::steps/);
    assert.match(output, /<Steps>/);
    assert.match(output, /<Step title="Create a file">/);
});

test('preprocessMarkdownSyntax leaves Accordion tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<Accordion title="What is Mintlify?">
  Mintlify is a documentation platform.
</Accordion>
\`\`\``);

    assert.doesNotMatch(output, /:::details/);
    assert.match(output, /<Accordion title="What is Mintlify\?">/);
});

test('preprocessMarkdownSyntax converts ResponseField to directive syntax', () => {
    const output =
        preprocessMarkdownSyntax(`<ResponseField name="id" type="string" required>
  Unique identifier for the resource.
</ResponseField>

<ResponseField name="slug" type="string" required deprecated>
  URL slug.
</ResponseField>`);

    assert.match(
        output,
        /:::responsefield\{name="id" type="string" required="true"\}/,
    );
    assert.match(
        output,
        /:::responsefield\{name="slug" type="string" required="true" deprecated="true"\}/,
    );
    assert.match(output, /Unique identifier for the resource\./);
});

test('preprocessMarkdownSyntax converts self-closing ResponseField correctly', () => {
    const output = preprocessMarkdownSyntax(
        `<ResponseField name="count" type="number" />`,
    );

    assert.match(output, /:::responsefield\{name="count" type="number"\}/);
});

test('preprocessMarkdownSyntax converts ParamField to directive syntax', () => {
    const output =
        preprocessMarkdownSyntax(`<ParamField path="slug" type="string" required>
  Slug used to resolve the page.
</ParamField>

<ParamField query="include" type="string" default="author" deprecated>
  Relations to include.
</ParamField>`);

    assert.match(
        output,
        /:::paramfield\{path="slug" type="string" required="true"\}/,
    );
    assert.match(
        output,
        /:::paramfield\{query="include" type="string" default="author" deprecated="true"\}/,
    );
    assert.match(output, /Slug used to resolve the page\./);
});

test('preprocessMarkdownSyntax converts CodeGroup to directive syntax', () => {
    const output = preprocessMarkdownSyntax(`<CodeGroup>

\`\`\`javascript JavaScript
const x = 1;
\`\`\`

\`\`\`python Python
x = 1
\`\`\`

</CodeGroup>`);

    assert.match(output, /:::codegroup/);
    assert.match(output, /^:::\s*$/m);
    assert.match(output, /```javascript JavaScript/);
    assert.match(output, /```python Python/);
});

test('preprocessMarkdownSyntax preserves code indentation inside CodeGroup fences', () => {
    const output = preprocessMarkdownSyntax(`<CodeGroup>

\`\`\`javascript JavaScript
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});
\`\`\`

</CodeGroup>`);

    assert.match(output, /\n  method: 'POST',/);
    assert.match(output, /\n  headers: \{ 'Content-Type': 'application\/json' \},/);
});

test('preprocessMarkdownSyntax leaves CodeGroup tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<CodeGroup>
\`\`\`javascript JavaScript
const x = 1;
\`\`\`
</CodeGroup>
\`\`\``);

    assert.doesNotMatch(output, /:::codegroup/);
    assert.match(output, /<CodeGroup>/);
});

test('preprocessMarkdownContent encodes image metadata outside fences only', () => {
    const output =
        preprocessMarkdownContent(`![Guide cover](/storage/guide.png =250x)
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
