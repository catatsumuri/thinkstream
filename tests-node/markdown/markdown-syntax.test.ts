import assert from 'node:assert/strict';
import test from 'node:test';
import type { Root } from 'mdast';
import { MARKDOWN_SYNTAX_MANIFEST } from '../../resources/js/lib/markdown-syntax-manifest.ts';
import {
    parseMarkdownImageMetadata,
    preprocessMarkdownContent,
    preprocessMarkdownSyntax,
} from '../../resources/js/lib/markdown-syntax.ts';
import { remarkFallbackDirective } from '../../resources/js/lib/remark-fallback-directive.ts';

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

test('preprocessMarkdownSyntax joins multiline Mintlify JSX tags before conversion', () => {
    const output = preprocessMarkdownSyntax(`<CardGroup
  cols={2}
>
  <Card
    title="Tabs"
    icon="react"
    href="/components/tabs"
  >
    Organize related content.
  </Card>
  <Card
    title="Links"
    icon="github"
    href="/components/links"
  />
</CardGroup>`);

    assert.match(output, /::::cardgroup\{cols="2"\}/);
    assert.match(
        output,
        /:::card\{title="Tabs" icon="react" href="\/components\/tabs"\}/,
    );
    assert.match(
        output,
        /:::card\{title="Links" icon="github" href="\/components\/links"\}/,
    );
    assert.match(output, /Organize related content\./);
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

test('remarkFallbackDirective restores unhandled text directives to literal text', () => {
    const tree: Root = {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    { type: 'text', value: 'Use lang' },
                    {
                        type: 'textDirective',
                        name: 'add',
                        attributes: {},
                        children: [],
                        data: {},
                    },
                    { type: 'text', value: ' for additions.' },
                ],
            },
        ],
    };

    remarkFallbackDirective()(tree);

    assert.deepEqual(tree, {
        type: 'root',
        children: [
            {
                type: 'paragraph',
                children: [
                    { type: 'text', value: 'Use lang' },
                    { type: 'text', value: ':add' },
                    { type: 'text', value: ' for additions.' },
                ],
            },
        ],
    });
});

test('markdown syntax manifest freezes the supported extension surface', () => {
    assert.deepEqual(MARKDOWN_SYNTAX_MANIFEST, {
        directiveAttributes: [
            'title',
            'icon',
            'sync',
            'borderBottom',
            'href',
            'cols',
            'name',
            'type',
            'required',
            'default',
            'deprecated',
            'path',
            'query',
            'body',
            'color',
            'size',
            'shape',
            'stroke',
            'disabled',
            'tip',
            'headline',
            'cta',
            'label',
            'description',
            'tags',
        ],
        mintlify: {
            blockTags: [
                'Card',
                'CardGroup',
                'Columns',
                'Tabs',
                'Tab',
                'Accordion',
                'Steps',
                'Step',
                'ResponseField',
                'ParamField',
                'CodeGroup',
                'Update',
                'Note',
                'Tip',
                'Info',
                'Warning',
                'Check',
            ],
            inlineTags: ['Badge', 'Tooltip'],
            treeTags: ['Tree', 'Tree.Folder', 'Tree.File'],
            multilineJoinableTags: [
                'Card',
                'CardGroup',
                'Columns',
                'Tabs',
                'Tab',
                'Accordion',
                'Steps',
                'Step',
                'ResponseField',
                'ParamField',
                'CodeGroup',
                'Update',
                'Note',
                'Tip',
                'Info',
                'Warning',
                'Check',
                'Badge',
                'Tooltip',
            ],
            calloutTags: {
                Note: ':::message{.note}',
                Tip: ':::message{.tip}',
                Info: ':::message',
                Warning: ':::message{.alert}',
                Check: ':::message{.check}',
            },
        },
        zenn: {
            messageVariants: ['alert', 'note', 'tip', 'info', 'check'],
            embedDirectives: ['card', 'github'],
        },
        rendererComponents: [
            'tabs',
            'tab',
            'card',
            'cardgroup',
            'steps',
            'step',
            'responsefield',
            'paramfield',
            'codegroup',
            'badge',
            'tooltip',
            'update',
            'tree',
        ],
        calloutVariants: ['note', 'tip', 'info', 'alert', 'check'],
    });
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

test('preprocessMarkdownSyntax converts Mintlify Tree to a tree directive with JSON payload', () => {
    const output = preprocessMarkdownSyntax(`<Tree>
  <Tree.Folder name="app" defaultOpen>
    <Tree.Folder name="components" openable={false}>
      <Tree.File name="Button.tsx" />
    </Tree.Folder>
    <Tree.File name="layout.tsx" />
  </Tree.Folder>
  <Tree.File name="package.json" />
</Tree>`);

    assert.match(output, /:::tree/);
    assert.match(output, /```json/);
    assert.match(output, /"type":"folder"/);
    assert.match(output, /"name":"app"/);
    assert.match(output, /"defaultOpen":true/);
    assert.match(output, /"openable":false/);
    assert.match(output, /"name":"Button\.tsx"/);
    assert.match(output, /"name":"package\.json"/);
    assert.match(output, /^:::\s*$/m);
});

test('preprocessMarkdownSyntax converts tree fenced blocks to a tree directive with inferred folders', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`tree
app/Ai
└── Agents
    ├── CoverImagePromptAgent.php
    ├── MarkdownStructureAgent.php
    ├── ThinkstreamStructureAgent.php
    ├── ThinkstreamTitleAgent.php
    └── TranslateSelectionAgent.php
\`\`\``);

    assert.match(output, /:::tree/);
    assert.match(output, /```json/);
    assert.match(output, /"name":"app"/);
    assert.match(output, /"name":"Ai"/);
    assert.match(output, /"name":"Agents"/);
    assert.match(output, /"defaultOpen":true/);
    assert.match(output, /"name":"CoverImagePromptAgent\.php"/);
    assert.match(output, /"name":"TranslateSelectionAgent\.php"/);
    assert.match(output, /^:::\s*$/m);
});

test('preprocessMarkdownSyntax ignores tree summary lines and honors trailing slash folder hints', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`tree
.
app/
└── Services/
    └── SyncFileParser.php

1 directory, 1 file
\`\`\``);

    assert.match(output, /"name":"app"/);
    assert.match(output, /"name":"Services"/);
    assert.match(output, /"name":"SyncFileParser\.php"/);
    assert.doesNotMatch(output, /directory, 1 file/);
});

test('preprocessMarkdownSyntax handles tree command output rooted at dot', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`tree
.
├── app
│   └── Services
│       └── SyncFileParser.php
└── tests
    └── Feature
        └── SyntaxSeederTest.php
\`\`\``);

    const json = /```json\n(?<payload>[\s\S]*?)\n```/.exec(output)?.groups
        ?.payload;

    assert.ok(json);

    const tree = JSON.parse(json);

    assert.equal(tree[0].name, 'app');
    assert.equal(tree[0].children[0].name, 'Services');
    assert.equal(tree[1].name, 'tests');
    assert.equal(tree[1].children[0].name, 'Feature');
});

test('preprocessMarkdownSyntax handles tree fenced blocks with shared leading indentation', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`tree
  app/Ai
  └── Agents
      └── TranslateSelectionAgent.php
\`\`\``);

    const json = /```json\n(?<payload>[\s\S]*?)\n```/.exec(output)?.groups
        ?.payload;

    assert.ok(json);

    const tree = JSON.parse(json);

    assert.equal(tree[0].name, 'app');
    assert.equal(tree[0].children[0].name, 'Ai');
    assert.equal(tree[0].children[0].children[0].name, 'Agents');
    assert.equal(
        tree[0].children[0].children[0].children[0].name,
        'TranslateSelectionAgent.php',
    );
    assert.doesNotMatch(output, /"name":"└── Agents"/);
});

test('preprocessMarkdownSyntax leaves tree fences untouched inside longer fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`\`md
\`\`\`tree
app/Ai
└── Agents
\`\`\`
\`\`\`\``);

    assert.doesNotMatch(output, /:::tree/);
    assert.match(output, /```tree/);
    assert.match(output, /└── Agents/);
});

test('preprocessMarkdownSyntax leaves unclosed tree fences untouched', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`tree
app/Ai
└── Agents`);

    assert.doesNotMatch(output, /:::tree/);
    assert.match(output, /```tree/);
    assert.match(output, /└── Agents/);
});

test('preprocessMarkdownSyntax converts quiz fenced blocks to a quiz directive with JSON payload', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`quiz
question: How does Next.js optimize fonts?
correct: D

A: It causes additional network requests which improve performance.
B: It disables all custom fonts.
C: It preloads all fonts at runtime.
D: It hosts font files with other static assets so that there are no additional network requests.

hint: Additional requests can impact performance.
incorrect: Not Quite
correctMessage: Correct
explanation: Next.js can self-host optimized font assets so the browser avoids extra third-party font requests.
\`\`\``);

    assert.match(output, /:::quiz/);
    assert.match(output, /```json/);
    assert.match(output, /"question":"How does Next\.js optimize fonts\?"/);
    assert.match(output, /"correct":"D"/);
    assert.match(output, /"label":"A"/);
    assert.match(output, /"label":"D"/);
    assert.match(output, /"incorrect":"Not Quite"/);
    assert.match(output, /"correctMessage":"Correct"/);
    assert.match(output, /"explanation":"Next\.js can self-host optimized font assets so the browser avoids extra third-party font requests\."/);
    assert.match(output, /^:::\s*$/m);
});

test('preprocessMarkdownSyntax leaves invalid quiz fenced blocks untouched', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`quiz
question: Missing correct answer

A: One
B: Two
\`\`\``);

    assert.doesNotMatch(output, /:::quiz/);
    assert.match(output, /```quiz/);
    assert.match(output, /question: Missing correct answer/);
});

test('preprocessMarkdownSyntax leaves quiz fences untouched inside longer fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`\`md
\`\`\`quiz
question: Example
correct: A

A: One
B: Two
\`\`\`
\`\`\`\``);

    assert.doesNotMatch(output, /:::quiz/);
    assert.match(output, /```quiz/);
    assert.match(output, /correct: A/);
});

test('preprocessMarkdownSyntax converts chart fenced blocks to a chart directive with JSON payload', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`chart:bar
_title: Flavor Profile
_min: 1
_max: 10
juniper: 9
citrus: 4
\`\`\``);

    assert.match(output, /:::chart/);
    assert.match(output, /```json/);
    assert.match(output, /"type":"bar"/);
    assert.match(output, /"title":"Flavor Profile"/);
    assert.match(output, /"min":1/);
    assert.match(output, /"max":10/);
    assert.match(output, /"label":"juniper"/);
    assert.match(output, /"value":9/);
    assert.match(output, /^:::\s*$/m);
});

test('preprocessMarkdownSyntax leaves invalid chart fenced blocks untouched', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`chart:radar
_title: Invalid Chart
juniper: nope
\`\`\``);

    assert.doesNotMatch(output, /:::chart/);
    assert.match(output, /```chart:radar/);
    assert.match(output, /juniper: nope/);
});

test('preprocessMarkdownSyntax leaves chart fences untouched inside longer fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`\`md
\`\`\`chart:bar
juniper: 9
\`\`\`
\`\`\`\``);

    assert.doesNotMatch(output, /:::chart/);
    assert.match(output, /```chart:bar/);
    assert.match(output, /juniper: 9/);
});

test('preprocessMarkdownSyntax joins multiline Tree child tags before encoding JSON', () => {
    const output = preprocessMarkdownSyntax(`<Tree>
  <Tree.Folder
    name="app"
    defaultOpen
  >
    <Tree.File
      name="index.tsx"
    />
  </Tree.Folder>
</Tree>`);

    assert.match(output, /"name":"app"/);
    assert.match(output, /"defaultOpen":true/);
    assert.match(output, /"name":"index\.tsx"/);
});

test('preprocessMarkdownSyntax leaves Tree tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<Tree>
  <Tree.Folder name="app" defaultOpen>
    <Tree.File name="index.tsx" />
  </Tree.Folder>
</Tree>
\`\`\``);

    assert.doesNotMatch(output, /:::tree/);
    assert.match(output, /<Tree>/);
    assert.match(output, /<Tree\.Folder name="app" defaultOpen>/);
});

test('preprocessMarkdownSyntax converts Mintlify Badge tags to text directives', () => {
    const output = preprocessMarkdownSyntax(
        'This feature requires a <Badge color="orange" size="sm">Premium</Badge> subscription.\n\n<Badge color="green" icon="circle-check">Stable</Badge>',
    );

    assert.match(
        output,
        /This feature requires a :badge\[Premium\]\{color="orange" size="sm"\} subscription\./,
    );
    assert.match(
        output,
        /:badge\[Stable\]\{color="green" icon="circle-check"\}/,
    );
});

test('preprocessMarkdownSyntax leaves Badge tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<Badge color="green" icon="circle-check">Stable</Badge>
\`\`\``);

    assert.doesNotMatch(output, /:badge\[/);
    assert.match(output, /<Badge color="green" icon="circle-check">Stable<\/Badge>/);
});

test('preprocessMarkdownSyntax converts Mintlify Tooltip tags to text directives', () => {
    const output = preprocessMarkdownSyntax(
        'Hover over <Tooltip tip="Application Programming Interface" headline="API" cta="Read more" href="/guides/index">API</Tooltip> for a definition.',
    );

    assert.match(
        output,
        /Hover over :tooltip\[API\]\{tip="Application Programming Interface" headline="API" cta="Read more" href="\/guides\/index"\} for a definition\./,
    );
});

test('preprocessMarkdownSyntax leaves Tooltip tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<Tooltip tip="Application Programming Interface">API</Tooltip>
\`\`\``);

    assert.doesNotMatch(output, /:tooltip\[/);
    assert.match(
        output,
        /<Tooltip tip="Application Programming Interface">API<\/Tooltip>/,
    );
});

test('preprocessMarkdownSyntax converts Mintlify Update to directive syntax', () => {
    const output = preprocessMarkdownSyntax(`<Update label="2024-10-11" description="v0.2.0" tags={["Feature", "Improvement"]}>

## Improved card icon support

Cards now support brand icons from the simple-icons library.

</Update>`);

    assert.match(
        output,
        /:::update\{label="2024-10-11" description="v0.2.0" tags="Feature,Improvement"\}/,
    );
    assert.match(output, /## Improved card icon support/);
});

test('preprocessMarkdownSyntax leaves Update tags untouched inside fenced code blocks', () => {
    const output = preprocessMarkdownSyntax(`\`\`\`mdx
<Update label="2024-10-11" description="v0.2.0" tags={["Feature", "Improvement"]}>
## Improved card icon support
</Update>
\`\`\``);

    assert.doesNotMatch(output, /:::update/);
    assert.match(output, /<Update label="2024-10-11"/);
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

    assert.match(output, /\n {2}method: 'POST',/);
    assert.match(output, /\n {2}headers: \{ 'Content-Type': 'application\/json' \},/);
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

test('preprocessMarkdownSyntax uses more colons for outer callout than inner when nested', () => {
    const output = preprocessMarkdownSyntax(`<Note>
  Outer note.
  <Info>
    Inner info.
  </Info>
</Note>`);

    const lines = output.split('\n');
    const outerLine = lines.find((l) => l.includes('message{.note}')) ?? '';
    const innerLine = lines.find((l) => /^:{3,}message(?!\{\.note\})/.test(l)) ?? '';
    const outerColons = (outerLine.match(/^(:{3,})/)?.[1] ?? '').length;
    const innerColons = (innerLine.match(/^(:{3,})/)?.[1] ?? '').length;

    assert.ok(outerColons >= 3, 'outer directive should use at least 3 colons');
    assert.ok(innerColons >= 3, 'inner directive should use at least 3 colons');
    assert.ok(outerColons > innerColons, 'outer directive must use more colons than inner to allow nesting');
    assert.match(output, /Outer note\./);
    assert.match(output, /Inner info\./);
});

test('preprocessMarkdownSyntax nested callout produces no stray ::: in output', () => {
    const output = preprocessMarkdownSyntax(`<Note>
  Some content.

  <Info>
    Nested hint.
  </Info>
</Note>`);

    const lines = output.split('\n');
    const strayClosings = lines.filter((l) => /^:{3}$/.test(l.trim()));

    assert.equal(strayClosings.length, 0, 'no stray ::: close tags should appear in output');
    assert.match(output, /Some content\./);
    assert.match(output, /Nested hint\./);
});

test('preprocessMarkdownSyntax supports three levels of callout nesting without stray :::', () => {
    const output = preprocessMarkdownSyntax(`<Note>
  Level one.
  <Info>
    Level two.
    <Tip>
      Level three.
    </Tip>
  </Info>
</Note>`);

    const lines = output.split('\n');
    const strayClosings = lines.filter((l) => /^:{3}$/.test(l.trim()));

    assert.equal(strayClosings.length, 0, 'no stray ::: close tags should appear');
    assert.match(output, /Level one\./);
    assert.match(output, /Level two\./);
    assert.match(output, /Level three\./);
});

test('preprocessMarkdownSyntax non-nested callout still emits a valid message directive', () => {
    const output = preprocessMarkdownSyntax(`<Note>
  Stand-alone note.
</Note>`);

    const lines = output.split('\n');
    const directiveLine = lines.find((l) => l.includes('message{.note}')) ?? '';

    assert.ok(/^:{3,}message\{\.note\}$/.test(directiveLine), 'directive line should be colons + message{.note}');
    assert.match(output, /Stand-alone note\./);
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
