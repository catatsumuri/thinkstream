const IMAGE_WIDTH_PARAM = '__markdown_width';
const IMAGE_HEIGHT_PARAM = '__markdown_height';
const IMAGE_CAPTION_PARAM = '__markdown_caption';

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
        urlObject.searchParams.set(IMAGE_WIDTH_PARAM, metadata.width);
    }

    if (metadata.height) {
        urlObject.searchParams.set(IMAGE_HEIGHT_PARAM, metadata.height);
    }

    if (metadata.caption) {
        urlObject.searchParams.set(IMAGE_CAPTION_PARAM, metadata.caption);
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
    const attributePattern =
        /(\w+)(?:=(?:"([^"]*)"|\{(true|false|\d+(?:\.\d+)?)\}))?/g;

    for (const match of attributeSource.matchAll(attributePattern)) {
        const [, key, quotedValue, jsxValue] = match;

        if (!key) {
            continue;
        }

        if (quotedValue !== undefined) {
            attributes[key] = quotedValue;
            continue;
        }

        if (jsxValue !== undefined) {
            if (jsxValue === 'true') {
                attributes[key] = true;
            } else if (jsxValue === 'false') {
                attributes[key] = false;
            } else {
                // Numeric value — store as string
                attributes[key] = jsxValue;
            }

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
        [
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
        ].includes(key),
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

const MINTLIFY_CALLOUT_TAGS = {
    Note: ':::message{.note}',
    Tip: ':::message{.tip}',
    Info: ':::message',
    Warning: ':::message{.alert}',
    Check: ':::message{.check}',
} as const;

type MintlifyCalloutTag = keyof typeof MINTLIFY_CALLOUT_TAGS;

export function preprocessMintlifySyntax(markdown: string): string {
    const lines = markdown.split('\n');
    const processedLines: string[] = [];
    let activeFence: string | null = null;
    let mintlifyTabsDepth = 0;
    const mintlifyTagStack: Array<
        | 'Tabs'
        | 'Tab'
        | 'Card'
        | 'CardGroup'
        | 'Accordion'
        | 'Steps'
        | 'Step'
        | 'ResponseField'
        | 'ParamField'
        | MintlifyCalloutTag
    > = [];

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

        // Mintlify callout open tag: <Note>, <Tip>, <Info>, <Warning>, <Check>
        const calloutOpenMatch = /^<(?<tag>Note|Tip|Info|Warning|Check)>$/.exec(
            trimmedLine,
        );

        if (calloutOpenMatch) {
            const tag = calloutOpenMatch.groups!.tag as MintlifyCalloutTag;

            pushBlankLineIfNeeded();
            pushLine(MINTLIFY_CALLOUT_TAGS[tag]);
            pushLine('');
            mintlifyTagStack.push(tag);

            continue;
        }

        const calloutCloseMatch =
            /^<\/(?<tag>Note|Tip|Info|Warning|Check)>$/.exec(trimmedLine);

        if (calloutCloseMatch) {
            const tag = calloutCloseMatch.groups!.tag as MintlifyCalloutTag;

            if (mintlifyTagStack.at(-1) === tag) {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        const cardGroupOpenMatch = /^<CardGroup(?<attributes>[^>]*)>$/.exec(
            trimmedLine,
        );

        if (cardGroupOpenMatch) {
            const attributes = parseJsxAttributes(
                cardGroupOpenMatch.groups?.attributes ?? '',
            );

            pushBlankLineIfNeeded();
            pushLine(`::::cardgroup${buildDirectiveAttributes(attributes)}`);
            pushLine('');
            mintlifyTagStack.push('CardGroup');

            continue;
        }

        if (trimmedLine === '</CardGroup>') {
            if (mintlifyTagStack.at(-1) === 'CardGroup') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine('::::');

            continue;
        }

        const cardTagMatch = /^<Card(?<attributes>[^>]*)>$/.exec(trimmedLine);

        if (cardTagMatch) {
            const rawAttrs = cardTagMatch.groups?.attributes ?? '';
            const isSelfClosing = rawAttrs.trimEnd().endsWith('/');
            const cleanAttrs = isSelfClosing
                ? rawAttrs.trimEnd().slice(0, -1)
                : rawAttrs;
            const attributes = parseJsxAttributes(cleanAttrs);

            pushBlankLineIfNeeded();
            pushLine(`:::card${buildDirectiveAttributes(attributes)}`);
            pushLine('');

            if (isSelfClosing) {
                pushLine(':::');
            } else {
                mintlifyTagStack.push('Card');
            }

            continue;
        }

        if (trimmedLine === '</Card>') {
            if (mintlifyTagStack.at(-1) === 'Card') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

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

        const accordionOpenMatch = /^<Accordion(?<attributes>[^>]*)>$/.exec(
            trimmedLine,
        );

        if (accordionOpenMatch) {
            const attributes = parseJsxAttributes(
                accordionOpenMatch.groups?.attributes ?? '',
            );
            const title =
                typeof attributes.title === 'string' ? attributes.title : '';

            pushBlankLineIfNeeded();
            pushLine(`:::details ${title}`);
            pushLine('');
            mintlifyTagStack.push('Accordion');

            continue;
        }

        if (trimmedLine === '</Accordion>') {
            if (mintlifyTagStack.at(-1) === 'Accordion') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        const stepsOpenMatch = /^<Steps(?<attributes>[^>]*)>$/.exec(
            trimmedLine,
        );

        if (stepsOpenMatch) {
            pushBlankLineIfNeeded();
            pushLine('::::steps');
            pushLine('');
            mintlifyTagStack.push('Steps');

            continue;
        }

        if (trimmedLine === '</Steps>') {
            if (mintlifyTagStack.at(-1) === 'Steps') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine('::::');

            continue;
        }

        const stepOpenMatch = /^<Step(?<attributes>[^>]*)>$/.exec(trimmedLine);

        if (stepOpenMatch) {
            const attributes = parseJsxAttributes(
                stepOpenMatch.groups?.attributes ?? '',
            );

            pushBlankLineIfNeeded();
            pushLine(`:::step${buildDirectiveAttributes(attributes)}`);
            pushLine('');
            mintlifyTagStack.push('Step');

            continue;
        }

        if (trimmedLine === '</Step>') {
            if (mintlifyTagStack.at(-1) === 'Step') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        const responseFieldTagMatch =
            /^<ResponseField(?<attributes>[^>]*)>$/.exec(trimmedLine);

        if (responseFieldTagMatch) {
            const rawAttrs = responseFieldTagMatch.groups?.attributes ?? '';
            const isSelfClosing = rawAttrs.trimEnd().endsWith('/');
            const cleanAttrs = isSelfClosing
                ? rawAttrs.trimEnd().slice(0, -1)
                : rawAttrs;
            const attributes = parseJsxAttributes(cleanAttrs);

            pushBlankLineIfNeeded();
            pushLine(`:::responsefield${buildDirectiveAttributes(attributes)}`);
            pushLine('');

            if (isSelfClosing) {
                pushLine(':::');
            } else {
                mintlifyTagStack.push('ResponseField');
            }

            continue;
        }

        if (trimmedLine === '</ResponseField>') {
            if (mintlifyTagStack.at(-1) === 'ResponseField') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        const paramFieldTagMatch = /^<ParamField(?<attributes>[^>]*)>$/.exec(
            trimmedLine,
        );

        if (paramFieldTagMatch) {
            const rawAttrs = paramFieldTagMatch.groups?.attributes ?? '';
            const isSelfClosing = rawAttrs.trimEnd().endsWith('/');
            const cleanAttrs = isSelfClosing
                ? rawAttrs.trimEnd().slice(0, -1)
                : rawAttrs;
            const attributes = parseJsxAttributes(cleanAttrs);

            pushBlankLineIfNeeded();
            pushLine(`:::paramfield${buildDirectiveAttributes(attributes)}`);
            pushLine('');

            if (isSelfClosing) {
                pushLine(':::');
            } else {
                mintlifyTagStack.push('ParamField');
            }

            continue;
        }

        if (trimmedLine === '</ParamField>') {
            if (mintlifyTagStack.at(-1) === 'ParamField') {
                mintlifyTagStack.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

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

function transformOutsideInlineCode(
    line: string,
    transform: (segment: string) => string,
): string {
    let result = '';
    let lastIndex = 0;

    for (const match of line.matchAll(/`+[^`]*`+/g)) {
        result += transform(line.slice(lastIndex, match.index));
        result += match[0];
        lastIndex = match.index! + match[0].length;
    }

    result += transform(line.slice(lastIndex));

    return result;
}

function transformOutsideFences(
    markdown: string,
    transform: (line: string) => string,
): string {
    const lines = markdown.split('\n');
    let activeFence: string | null = null;

    return lines
        .map((line) => {
            const trimmed = line.trim();
            const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed);

            if (fenceMatch) {
                const fence = fenceMatch[1];
                const remainder = trimmed.slice(fence.length);

                if (activeFence === null) {
                    activeFence = fence;
                } else if (
                    fence[0] === activeFence[0] &&
                    fence.length >= activeFence.length &&
                    remainder.trim() === ''
                ) {
                    activeFence = null;
                }

                return line;
            }

            if (activeFence !== null) {
                return line;
            }

            return transformOutsideInlineCode(line, transform);
        })
        .join('\n');
}

export function preprocessMarkdownSyntax(markdown: string): string {
    return transformOutsideFences(preprocessMintlifySyntax(markdown), (line) =>
        line
            // Normalize :::message <type> to the attribute form remark-directive expects.
            .replace(
                /:::message\s+(alert|note|tip|info|check)\b/,
                ':::message{.$1}',
            )
            // Convert :::details title to the label form remark-directive expects.
            .replace(/:::details\s+(.+?)$/, ':::details[$1]')
            // Convert @[card](URL) to a bare URL line so remark-linkify-to-card picks it up.
            .replace(/^@\[card\]\((https?:\/\/[^\s)]+)\)$/, '$1')
            // Convert @[github](URL) to a bare URL line so remark-linkify-to-card picks it up.
            .replace(/^@\[github\]\((https?:\/\/[^\s)]+)\)$/, '$1'),
    );
}

export function preprocessMarkdownContent(markdown: string): string {
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

export function parseMarkdownImageMetadata(url?: string | null): ImageMetadata {
    if (!url) {
        return { src: '' };
    }

    const urlObject = new URL(url, 'https://zenn.local');
    const width = urlObject.searchParams.get(IMAGE_WIDTH_PARAM);
    const height = urlObject.searchParams.get(IMAGE_HEIGHT_PARAM);
    const caption = urlObject.searchParams.get(IMAGE_CAPTION_PARAM);

    urlObject.searchParams.delete(IMAGE_WIDTH_PARAM);
    urlObject.searchParams.delete(IMAGE_HEIGHT_PARAM);
    urlObject.searchParams.delete(IMAGE_CAPTION_PARAM);

    return {
        src: isAbsoluteUrl(url)
            ? urlObject.toString()
            : `${urlObject.pathname}${urlObject.search}${urlObject.hash}`,
        width: width ? Number(width) : undefined,
        height: height ? Number(height) : undefined,
        caption: caption || undefined,
    };
}
