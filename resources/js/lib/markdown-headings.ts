import { normalizeMarkdownHeadingText } from './markdown-heading-text.js';
import { slugify } from './slugify.js';

export type MarkdownHeading = {
    level: number;
    text: string;
    id: string;
};

export function extractMarkdownHeadings(
    content: string,
    postSlug: string,
): MarkdownHeading[] {
    const headings: MarkdownHeading[] = [];
    const idCounts = new Map<string, number>();
    let activeFence: string | null = null;

    for (const line of content.split('\n')) {
        const trimmedLine = line.trimStart();
        const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmedLine);

        if (fenceMatch) {
            const fence = fenceMatch[1];
            const remainder = trimmedLine.slice(fence.length);

            if (activeFence === null) {
                activeFence = fence;
            } else if (
                fence[0] === activeFence[0] &&
                fence.length >= activeFence.length &&
                remainder.trim() === ''
            ) {
                activeFence = null;
            }

            continue;
        }

        if (activeFence !== null) {
            continue;
        }

        const match = /^(#{1,3})\s+(.+)$/.exec(trimmedLine);

        if (match === null) {
            continue;
        }

        const text = normalizeMarkdownHeadingText(match[2].trim());
        const baseId = `${postSlug}-${slugify(text)}`;
        const count = (idCounts.get(baseId) ?? 0) + 1;

        idCounts.set(baseId, count);
        headings.push({
            level: match[1].length,
            text,
            id: count === 1 ? baseId : `${baseId}-${count}`,
        });
    }

    return headings;
}
