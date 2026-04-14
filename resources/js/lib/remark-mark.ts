import { pandocMarkFromMarkdown } from 'mdast-util-mark';
// micromark-extension-mark has no bundled types
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { pandocMark } from 'micromark-extension-mark';
import type { Processor } from 'unified';

/**
 * Remark plugin to support ==highlight== syntax, rendered as <mark>.
 * Uses micromark-extension-mark + mdast-util-mark.
 */
export function remarkMark(this: Processor): void {
    const data = this.data() as Record<string, unknown[]>;
    (data['micromarkExtensions'] ??= []).push(pandocMark());
    (data['fromMarkdownExtensions'] ??= []).push(pandocMarkFromMarkdown);
}
