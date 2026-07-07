/**
 * Frozen public syntax surface of the markdown renderer.
 *
 * Every list in this module is a compatibility contract for published
 * content: additions are safe, renames and removals are breaking. Any change
 * here must be mirrored in the deepEqual freeze test in
 * tests-node/markdown/markdown-syntax.test.ts.
 */
export const MARKDOWN_DIRECTIVE_ATTRIBUTE_NAMES = [
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
] as const;

export const MINTLIFY_CALLOUT_TAGS = {
    Note: ':::message{.note}',
    Tip: ':::message{.tip}',
    Info: ':::message',
    Warning: ':::message{.alert}',
    Check: ':::message{.check}',
} as const;

export const MINTLIFY_CALLOUT_TAG_NAMES = [
    'Note',
    'Tip',
    'Info',
    'Warning',
    'Check',
] as const;

export const MINTLIFY_BLOCK_TAG_NAMES = [
    'Card',
    'CardGroup',
    'Columns',
    'Tabs',
    'Tab',
    'Accordion',
    'AccordionGroup',
    'Steps',
    'Step',
    'ResponseField',
    'ParamField',
    'CodeGroup',
    'Update',
    ...MINTLIFY_CALLOUT_TAG_NAMES,
] as const;

export const MINTLIFY_INLINE_TAG_NAMES = ['Badge', 'Tooltip'] as const;

export const MINTLIFY_TREE_TAG_NAMES = [
    'Tree',
    'Tree.Folder',
    'Tree.File',
] as const;

export const MINTLIFY_MULTILINE_JOINABLE_TAG_NAMES = [
    ...MINTLIFY_BLOCK_TAG_NAMES,
    ...MINTLIFY_INLINE_TAG_NAMES,
] as const;

export const ZENN_MESSAGE_VARIANTS = [
    'alert',
    'note',
    'tip',
    'info',
    'check',
] as const;

export const ZENN_EMBED_DIRECTIVES = ['card', 'github'] as const;

/**
 * GitHub blockquote alert markers (`> [!NOTE]` etc.) mapped onto the internal
 * callout variants rendered by MessageBox. WARNING and CAUTION intentionally
 * share the `alert` variant; there is no GitHub form for `check`.
 */
export const GITHUB_ALERT_VARIANTS = {
    NOTE: 'note',
    TIP: 'tip',
    IMPORTANT: 'info',
    WARNING: 'alert',
    CAUTION: 'alert',
} as const;

export const MARKDOWN_CALLOUT_VARIANTS = [
    'note',
    'tip',
    'info',
    'alert',
    'check',
] as const;

export const MARKDOWN_CUSTOM_COMPONENT_NAMES = [
    'tabs',
    'tab',
    'card',
    'cardgroup',
    'accordion-group',
    'steps',
    'step',
    'responsefield',
    'paramfield',
    'codegroup',
    'badge',
    'tooltip',
    'update',
    'tree',
] as const;

/**
 * Syntax the renderer intentionally does not support:
 * - math: `$...$` / `$$...$$` render as literal text (no remark-math/KaTeX).
 * - raw-html: raw HTML renders as escaped literal text (no rehype-raw).
 * - frontmatter: leading `---` blocks are stripped at import time by
 *   app/Services/SyncFileParser.php; the renderer treats them as plain
 *   markdown.
 */
export const MARKDOWN_UNSUPPORTED_SYNTAX = [
    'math',
    'raw-html',
    'frontmatter',
] as const;

export const MARKDOWN_SYNTAX_MANIFEST = {
    directiveAttributes: [...MARKDOWN_DIRECTIVE_ATTRIBUTE_NAMES],
    mintlify: {
        blockTags: [...MINTLIFY_BLOCK_TAG_NAMES],
        inlineTags: [...MINTLIFY_INLINE_TAG_NAMES],
        treeTags: [...MINTLIFY_TREE_TAG_NAMES],
        multilineJoinableTags: [...MINTLIFY_MULTILINE_JOINABLE_TAG_NAMES],
        calloutTags: { ...MINTLIFY_CALLOUT_TAGS },
    },
    zenn: {
        messageVariants: [...ZENN_MESSAGE_VARIANTS],
        embedDirectives: [...ZENN_EMBED_DIRECTIVES],
    },
    github: {
        alertVariants: { ...GITHUB_ALERT_VARIANTS },
    },
    rendererComponents: [...MARKDOWN_CUSTOM_COMPONENT_NAMES],
    calloutVariants: [...MARKDOWN_CALLOUT_VARIANTS],
    unsupported: [...MARKDOWN_UNSUPPORTED_SYNTAX],
} as const;
