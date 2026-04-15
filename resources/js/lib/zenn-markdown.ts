const WIDTH_PARAM = '__zenn_width';
const HEIGHT_PARAM = '__zenn_height';
const CAPTION_PARAM = '__zenn_caption';

type ImageMetadata = {
    src: string;
    width?: number;
    height?: number;
    caption?: string;
};

type EncodedMetadata = {
    width?: string;
    height?: string;
    caption?: string;
};

function isAbsoluteUrl(url: string): boolean {
    return (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('//') ||
        url.startsWith('data:')
    );
}

function buildUrlWithMetadata(url: string, metadata: EncodedMetadata): string {
    const urlObject = new URL(url, 'https://zenn.local');

    if (metadata.width) {
        urlObject.searchParams.set(WIDTH_PARAM, metadata.width);
    }

    if (metadata.height) {
        urlObject.searchParams.set(HEIGHT_PARAM, metadata.height);
    }

    if (metadata.caption) {
        urlObject.searchParams.set(CAPTION_PARAM, metadata.caption);
    }

    if (isAbsoluteUrl(url)) {
        return urlObject.toString();
    }

    return `${urlObject.pathname}${urlObject.search}${urlObject.hash}`;
}

function encodeImageTarget(target: string, caption?: string): string {
    const match = /^(?<url>\S+?)(?:\s+=(?<width>\d+)x(?<height>\d*))?$/.exec(
        target,
    );

    if (!match?.groups?.url) {
        return target;
    }

    return buildUrlWithMetadata(match.groups.url, {
        width: match.groups.width,
        height: match.groups.height,
        caption,
    });
}

function rewriteImageLine(line: string, caption?: string): string | null {
    const plainImageMatch = /^!\[(?<alt>[^\]]*)\]\((?<target>.+)\)$/.exec(line);

    if (plainImageMatch?.groups?.target !== undefined) {
        const encodedTarget = encodeImageTarget(
            plainImageMatch.groups.target,
            caption,
        );

        return `![${plainImageMatch.groups.alt}](${encodedTarget})`;
    }

    const linkedImageMatch =
        /^\[!\[(?<alt>[^\]]*)\]\((?<target>.+)\)\]\((?<href>.+)\)$/.exec(line);

    if (linkedImageMatch?.groups?.target !== undefined) {
        const encodedTarget = encodeImageTarget(
            linkedImageMatch.groups.target,
            caption,
        );

        return `[![${linkedImageMatch.groups.alt}](${encodedTarget})](${linkedImageMatch.groups.href})`;
    }

    return null;
}

function parseJsxAttributes(
    attributeSource: string,
): Record<string, string | boolean> {
    const attributes: Record<string, string | boolean> = {};
    const attributePattern = /(\w+)(?:=(?:"([^"]*)"|\{(true|false)\}))?/g;

    for (const match of attributeSource.matchAll(attributePattern)) {
        const [, key, quotedValue, booleanValue] = match;

        if (!key) {
            continue;
        }

        if (quotedValue !== undefined) {
            attributes[key] = quotedValue;
            continue;
        }

        if (booleanValue !== undefined) {
            attributes[key] = booleanValue === 'true';
            continue;
        }

        attributes[key] = true;
    }

    return attributes;
}

function buildDirectiveAttributes(
    attributes: Record<string, string | boolean>,
): string {
    const supportedEntries = Object.entries(attributes).filter(([key]) =>
        ['title', 'icon', 'sync', 'borderBottom'].includes(key),
    );

    if (supportedEntries.length === 0) {
        return '';
    }

    const serialized = supportedEntries
        .map(([key, value]) => {
            if (typeof value === 'boolean') {
                return `${key}="${value ? 'true' : 'false'}"`;
            }

            return `${key}="${value.replaceAll('"', '&quot;')}"`;
        })
        .join(' ');

    return `{${serialized}}`;
}

export function preprocessMintlifySyntax(markdown: string): string {
    const lines = markdown.split('\n');
    const processedLines: string[] = [];
    let activeFence: string | null = null;
    let mintlifyTabsDepth = 0;
    const mintlifyTagStack: Array<'Tabs' | 'Tab'> = [];

    const pushLine = (value: string): void => {
        processedLines.push(value);
    };

    const pushBlankLineIfNeeded = (): void => {
        if (processedLines.at(-1) !== '') {
            processedLines.push('');
        }
    };

    for (const line of lines) {
        const trimmedLine = line.trim();
        const indentWidth = mintlifyTagStack.length * 2;
        const effectiveLine =
            mintlifyTagStack.length > 0
                ? line.replace(new RegExp(`^ {0,${indentWidth}}`), '')
                : line;
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

            processedLines.push(effectiveLine);

            continue;
        }

        if (activeFence !== null) {
            processedLines.push(effectiveLine);

            continue;
        }

        const tabsOpenMatch = /^<Tabs(?<attributes>[^>]*)>$/.exec(trimmedLine);

        if (tabsOpenMatch) {
            const attributes = parseJsxAttributes(
                tabsOpenMatch.groups?.attributes ?? '',
            );

            pushBlankLineIfNeeded();
            pushLine(`::::tabs${buildDirectiveAttributes(attributes)}`);
            pushLine('');
            mintlifyTabsDepth++;
            mintlifyTagStack.push('Tabs');

            continue;
        }

        const tabOpenMatch = /^<Tab(?<attributes>[^>]*)>$/.exec(trimmedLine);

        if (tabOpenMatch) {
            const attributes = parseJsxAttributes(
                tabOpenMatch.groups?.attributes ?? '',
            );

            pushBlankLineIfNeeded();
            pushLine(`:::tab${buildDirectiveAttributes(attributes)}`);
            pushLine('');
            mintlifyTagStack.push('Tab');

            continue;
        }

        if (trimmedLine === '</Tab>') {
            if (mintlifyTagStack.at(-1) === 'Tab') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        if (trimmedLine === '</Tabs>') {
            if (mintlifyTagStack.at(-1) === 'Tabs') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(mintlifyTabsDepth > 0 ? '::::' : ':::');
            mintlifyTabsDepth = Math.max(0, mintlifyTabsDepth - 1);

            continue;
        }

        if (mintlifyTagStack.length > 0) {
            processedLines.push(effectiveLine);

            continue;
        }

        processedLines.push(line);
    }

    return processedLines.join('\n');
}

export function preprocessZennSyntax(markdown: string): string {
    return (
        preprocessMintlifySyntax(markdown)
            // Normalize :::message alert to the attribute form remark-directive expects.
            .replace(/:::message\s+alert\b/g, ':::message{.alert}')
            // Convert :::details title to the label form remark-directive expects.
            .replace(/:::details\s+(.+?)(\r?\n)/g, ':::details[$1]$2')
            // Convert @[card](URL) to a bare URL line so remark-linkify-to-card picks it up.
            .replace(/^@\[card\]\((https?:\/\/[^\s)]+)\)$/gm, '$1')
            // Convert @[github](URL) to a bare URL line so remark-linkify-to-card picks it up.
            .replace(/^@\[github\]\((https?:\/\/[^\s)]+)\)$/gm, '$1')
    );
}

export function preprocessZennMarkdown(markdown: string): string {
    const lines = markdown.split('\n');
    const processedLines: string[] = [];
    let activeFence: string | null = null;

    for (let index = 0; index < lines.length; index++) {
        const currentLine = lines[index];
        const trimmedLine = currentLine.trim();
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

            processedLines.push(currentLine);

            continue;
        }

        if (activeFence !== null) {
            processedLines.push(currentLine);

            continue;
        }

        const nextLine = lines[index + 1];
        const captionMatch = /^\*(.+)\*$/.exec(nextLine?.trim() ?? '');
        const rewrittenLine = rewriteImageLine(
            trimmedLine,
            captionMatch?.[1]?.trim(),
        );

        if (rewrittenLine === null) {
            processedLines.push(currentLine);
            continue;
        }

        processedLines.push(currentLine.replace(trimmedLine, rewrittenLine));

        if (captionMatch) {
            index++;
        }
    }

    return processedLines.join('\n');
}

export function parseZennImageMetadata(url?: string | null): ImageMetadata {
    if (!url) {
        return { src: '' };
    }

    const urlObject = new URL(url, 'https://zenn.local');
    const width = urlObject.searchParams.get(WIDTH_PARAM);
    const height = urlObject.searchParams.get(HEIGHT_PARAM);
    const caption = urlObject.searchParams.get(CAPTION_PARAM);

    urlObject.searchParams.delete(WIDTH_PARAM);
    urlObject.searchParams.delete(HEIGHT_PARAM);
    urlObject.searchParams.delete(CAPTION_PARAM);

    return {
        src: isAbsoluteUrl(url)
            ? urlObject.toString()
            : `${urlObject.pathname}${urlObject.search}${urlObject.hash}`,
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        caption: caption || undefined,
    };
}
