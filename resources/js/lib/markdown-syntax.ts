import {
    MARKDOWN_DIRECTIVE_ATTRIBUTE_NAMES,
    MINTLIFY_CALLOUT_TAG_NAMES,
    MINTLIFY_CALLOUT_TAGS,
    MINTLIFY_MULTILINE_JOINABLE_TAG_NAMES,
    ZENN_EMBED_DIRECTIVES,
    ZENN_MESSAGE_VARIANTS,
} from './markdown-syntax-manifest.js';

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

export function isAbsoluteUrl(url: string): boolean {
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
    // Normalize JSX array values: tags={["A", "B"]} → tags="A,B"
    attributeSource = attributeSource.replace(
        /(\w+)=\{(\[[^\]]*\])\}/g,
        (_: string, key: string, arrayJson: string) => {
            const values = [...arrayJson.matchAll(/"([^"]*)"/g)].map(
                (m) => m[1],
            );

            return `${key}="${values.join(',')}"`;
        },
    );

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
        MARKDOWN_DIRECTIVE_ATTRIBUTE_NAMES.includes(
            key as (typeof MARKDOWN_DIRECTIVE_ATTRIBUTE_NAMES)[number],
        ),
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

type MintlifyCalloutTag = keyof typeof MINTLIFY_CALLOUT_TAGS;

const MULTILINE_TAG_OPEN_RE = new RegExp(
    `^<(${MINTLIFY_MULTILINE_JOINABLE_TAG_NAMES.join('|')})(?:\\s|$)`,
);

const MINTLIFY_CALLOUT_TAG_PATTERN = MINTLIFY_CALLOUT_TAG_NAMES.join('|');
const ZENN_MESSAGE_VARIANT_PATTERN = ZENN_MESSAGE_VARIANTS.join('|');
const ZENN_EMBED_DIRECTIVE_PATTERN = ZENN_EMBED_DIRECTIVES.join('|');

function joinMultilineJsxTags(markdown: string): string {
    const lines = markdown.split('\n');
    const result: string[] = [];
    let i = 0;
    let activeFence: string | null = null;

    while (i < lines.length) {
        const line = lines[i];
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

            result.push(line);
            i++;
            continue;
        }

        if (activeFence !== null) {
            result.push(line);
            i++;
            continue;
        }

        if (MULTILINE_TAG_OPEN_RE.test(trimmed) && !trimmed.includes('>')) {
            let accumulated = trimmed;
            i++;

            while (i < lines.length) {
                const nextTrimmed = lines[i].trim();
                i++;

                if (nextTrimmed === '/>') {
                    accumulated += '/>';
                    break;
                }

                if (nextTrimmed === '>') {
                    accumulated += '>';
                    break;
                }

                accumulated += ' ' + nextTrimmed;

                if (
                    accumulated.trimEnd().endsWith('/>') ||
                    accumulated.trimEnd().endsWith('>')
                ) {
                    break;
                }
            }

            result.push(accumulated);
            continue;
        }

        result.push(line);
        i++;
    }

    return result.join('\n');
}

export function preprocessMintlifySyntax(markdown: string): string {
    markdown = joinMultilineJsxTags(markdown);
    const lines = markdown.split('\n');
    const processedLines: string[] = [];
    let activeFence: string | null = null;
    let activeFenceIndent = 0;
    let treeFence: {
        openingLine: string;
        fence: string;
        lines: string[];
    } | null = null;
    let mintlifyTabsDepth = 0;
    const mintlifyCalloutColonCounts: number[] = [];
    const mintlifyTagStack: Array<
        | 'Tabs'
        | 'Tab'
        | 'Card'
        | 'CardGroup'
        | 'Columns'
        | 'Accordion'
        | 'Steps'
        | 'Step'
        | 'ResponseField'
        | 'ParamField'
        | 'CodeGroup'
        | 'Update'
        | MintlifyCalloutTag
    > = [];
    const mintlifyTagLeadingSpaces: number[] = [];
    let treeBuffer: string[] | null = null;

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
        const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;
        const indentWidth =
            mintlifyTagStack.length > 0
                ? (mintlifyTagLeadingSpaces.at(-1) ?? 0) + 4
                : 0;
        const effectiveLine =
            mintlifyTagStack.length > 0
                ? line.replace(new RegExp(`^ {0,${indentWidth}}`), '')
                : line;
        const fenceContentLine =
            activeFence !== null && activeFenceIndent > 0
                ? line.replace(new RegExp(`^ {0,${activeFenceIndent}}`), '')
                : line;
        const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmedLine);

        if (treeFence !== null) {
            const remainder = fenceMatch
                ? trimmedLine.slice(fenceMatch[1].length)
                : '';

            if (
                fenceMatch &&
                fenceMatch[1][0] === treeFence.fence[0] &&
                fenceMatch[1].length >= treeFence.fence.length &&
                remainder.trim() === ''
            ) {
                pushTreeDirective(
                    processedLines,
                    parseAsciiTreeContent(treeFence.lines),
                    pushBlankLineIfNeeded,
                    pushLine,
                );
                treeFence = null;
            } else {
                treeFence.lines.push(line);
            }

            continue;
        }

        if (fenceMatch && activeFence === null) {
            const fence = fenceMatch[1];
            const infoString = trimmedLine.slice(fence.length).trim();

            if (/^tree(?:\s|$)/.test(infoString)) {
                treeFence = { openingLine: line, fence, lines: [] };

                continue;
            }
        }

        if (fenceMatch) {
            const fence = fenceMatch[1];
            const remainder = trimmedLine.slice(fence.length);

            if (activeFence === null) {
                activeFence = fence;
                activeFenceIndent = leadingSpaces;
            } else if (
                fence[0] === activeFence[0] &&
                fence.length >= activeFence.length &&
                remainder.trim() === ''
            ) {
                activeFence = null;
                activeFenceIndent = 0;
            }

            processedLines.push(
                activeFence === null ? fenceContentLine : effectiveLine,
            );

            continue;
        }

        if (activeFence !== null) {
            processedLines.push(fenceContentLine);

            continue;
        }

        if (treeBuffer !== null) {
            if (trimmedLine === '</Tree>') {
                pushTreeDirective(
                    processedLines,
                    parseTreeContent(treeBuffer),
                    pushBlankLineIfNeeded,
                    pushLine,
                );
                treeBuffer = null;
            } else {
                treeBuffer.push(line);
            }

            continue;
        }

        if (trimmedLine === '<Tree>') {
            treeBuffer = [];

            continue;
        }

        // Mintlify callout open tag: <Note>, <Tip>, <Info>, <Warning>, <Check>
        const calloutOpenMatch = new RegExp(
            `^<(?<tag>${MINTLIFY_CALLOUT_TAG_PATTERN})>$`,
        ).exec(trimmedLine);

        if (calloutOpenMatch) {
            const tag = calloutOpenMatch.groups!.tag as MintlifyCalloutTag;
            const colonCount = 3 + 5 - mintlifyCalloutColonCounts.length;
            const template = MINTLIFY_CALLOUT_TAGS[tag];
            const directiveBody = template.slice(3);

            pushBlankLineIfNeeded();
            pushLine(':'.repeat(colonCount) + directiveBody);
            pushLine('');
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push(tag);
            mintlifyCalloutColonCounts.push(colonCount);

            continue;
        }

        const calloutCloseMatch = new RegExp(
            `^<\\/(?<tag>${MINTLIFY_CALLOUT_TAG_PATTERN})>$`,
        ).exec(trimmedLine);

        if (calloutCloseMatch) {
            const tag = calloutCloseMatch.groups!.tag as MintlifyCalloutTag;
            let colonCount = 3;

            if (mintlifyTagStack.at(-1) === tag) {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
                colonCount = mintlifyCalloutColonCounts.pop() ?? 3;
            }

            pushBlankLineIfNeeded();
            pushLine(':'.repeat(colonCount));

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
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('CardGroup');

            continue;
        }

        if (trimmedLine === '</CardGroup>') {
            if (mintlifyTagStack.at(-1) === 'CardGroup') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
            }

            pushBlankLineIfNeeded();
            pushLine('::::');

            continue;
        }

        const columnsOpenMatch = /^<Columns(?<attributes>[^>]*)>$/.exec(
            trimmedLine,
        );

        if (columnsOpenMatch) {
            const attributes = parseJsxAttributes(
                columnsOpenMatch.groups?.attributes ?? '',
            );

            pushBlankLineIfNeeded();
            pushLine(`::::cardgroup${buildDirectiveAttributes(attributes)}`);
            pushLine('');
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('Columns');

            continue;
        }

        if (trimmedLine === '</Columns>') {
            if (mintlifyTagStack.at(-1) === 'Columns') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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
                mintlifyTagLeadingSpaces.push(leadingSpaces);
                mintlifyTagStack.push('Card');
            }

            continue;
        }

        if (trimmedLine === '</Card>') {
            if (mintlifyTagStack.at(-1) === 'Card') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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
            mintlifyTagLeadingSpaces.push(leadingSpaces);
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
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('Tab');

            continue;
        }

        if (trimmedLine === '</Tab>') {
            if (mintlifyTagStack.at(-1) === 'Tab') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        if (trimmedLine === '</Tabs>') {
            if (mintlifyTagStack.at(-1) === 'Tabs') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('Accordion');

            continue;
        }

        if (trimmedLine === '</Accordion>') {
            if (mintlifyTagStack.at(-1) === 'Accordion') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        const updateOpenMatch = /^<Update(?<attributes>[^>]*)>$/.exec(
            trimmedLine,
        );

        if (updateOpenMatch) {
            const attributes = parseJsxAttributes(
                updateOpenMatch.groups?.attributes ?? '',
            );

            pushBlankLineIfNeeded();
            pushLine(`:::update${buildDirectiveAttributes(attributes)}`);
            pushLine('');
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('Update');

            continue;
        }

        if (trimmedLine === '</Update>') {
            if (mintlifyTagStack.at(-1) === 'Update') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('Steps');

            continue;
        }

        if (trimmedLine === '</Steps>') {
            if (mintlifyTagStack.at(-1) === 'Steps') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('Step');

            continue;
        }

        if (trimmedLine === '</Step>') {
            if (mintlifyTagStack.at(-1) === 'Step') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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
                mintlifyTagLeadingSpaces.push(leadingSpaces);
                mintlifyTagStack.push('ResponseField');
            }

            continue;
        }

        if (trimmedLine === '</ResponseField>') {
            if (mintlifyTagStack.at(-1) === 'ResponseField') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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
                mintlifyTagLeadingSpaces.push(leadingSpaces);
                mintlifyTagStack.push('ParamField');
            }

            continue;
        }

        if (trimmedLine === '</ParamField>') {
            if (mintlifyTagStack.at(-1) === 'ParamField') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
            }

            pushBlankLineIfNeeded();
            pushLine(':::');

            continue;
        }

        if (trimmedLine === '<CodeGroup>') {
            pushBlankLineIfNeeded();
            pushLine(':::codegroup');
            pushLine('');
            mintlifyTagLeadingSpaces.push(leadingSpaces);
            mintlifyTagStack.push('CodeGroup');

            continue;
        }

        if (trimmedLine === '</CodeGroup>') {
            if (mintlifyTagStack.at(-1) === 'CodeGroup') {
                mintlifyTagStack.pop();
                mintlifyTagLeadingSpaces.pop();
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

    if (treeFence !== null) {
        processedLines.push(treeFence.openingLine, ...treeFence.lines);
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

interface TreeNode {
    type: 'folder' | 'file';
    name: string;
    defaultOpen?: boolean;
    openable?: boolean;
    children?: TreeNode[];
}

function createAsciiTreeFolderNode(name: string): TreeNode {
    return {
        type: 'folder',
        name,
        defaultOpen: true,
        children: [],
    };
}

function createAsciiTreeFileNode(name: string): TreeNode {
    return {
        type: 'file',
        name,
    };
}

function ensureTreeNodeIsFolder(node: TreeNode): TreeNode {
    if (node.type === 'folder') {
        node.children ??= [];

        return node;
    }

    node.type = 'folder';
    node.defaultOpen = true;
    node.children = [];

    return node;
}

function splitTreePathSegments(value: string): string[] {
    return value
        .split('/')
        .map((segment) => segment.trim())
        .filter(Boolean);
}

function parseAsciiTreeContent(lines: string[]): TreeNode[] {
    const root: TreeNode[] = [];
    const stack: TreeNode[] = [];
    let rootBranchDepthOffset = 0;
    const normalizedLines = (() => {
        const nonEmptyLines = lines.filter((line) => line.trim() !== '');
        const sharedIndent = nonEmptyLines.reduce<number>((minimum, line) => {
            const leadingSpaces = line.match(/^ */)?.[0].length ?? 0;

            return Math.min(minimum, leadingSpaces);
        }, Number.POSITIVE_INFINITY);

        if (!Number.isFinite(sharedIndent) || sharedIndent === 0) {
            return lines;
        }

        return lines.map((line) => line.slice(sharedIndent));
    })();

    const appendPath = (depth: number, rawValue: string): void => {
        const isFolderHint = rawValue.endsWith('/');
        const segments = splitTreePathSegments(
            isFolderHint ? rawValue.slice(0, -1) : rawValue,
        );

        if (segments.length === 0) {
            return;
        }

        let children =
            depth === 0 || stack[depth - 1] === undefined
                ? root
                : ensureTreeNodeIsFolder(stack[depth - 1]).children!;
        let currentDepth = depth;

        for (const [index, segment] of segments.entries()) {
            const isLastSegment = index === segments.length - 1;
            const node =
                !isLastSegment || isFolderHint
                    ? createAsciiTreeFolderNode(segment)
                    : createAsciiTreeFileNode(segment);

            children.push(node);
            stack[currentDepth] = node;
            stack.length = currentDepth + 1;

            if (node.type === 'folder') {
                children = node.children!;
                currentDepth++;
            }
        }
    };

    for (const line of normalizedLines) {
        const trimmed = line.trimEnd();

        if (
            trimmed === '' ||
            /^\d+\s+director(?:y|ies)(?:,\s+\d+\s+files?)?$/.test(trimmed)
        ) {
            continue;
        }

        if (trimmed.trim() === '.') {
            rootBranchDepthOffset = -1;

            continue;
        }

        const branchMatch =
            /^(?<prefix>(?:│   |    )*)(?:├── |└── )(?<value>.+)$/.exec(
                trimmed,
            );

        if (!branchMatch?.groups?.value) {
            const rawValue = trimmed.trim();
            appendPath(0, rawValue);

            rootBranchDepthOffset = Math.max(
                0,
                splitTreePathSegments(
                    rawValue.endsWith('/') ? rawValue.slice(0, -1) : rawValue,
                ).length - 1,
            );
            continue;
        }

        const depth =
            Math.floor(branchMatch.groups.prefix.length / 4) +
            1 +
            rootBranchDepthOffset;
        appendPath(depth, branchMatch.groups.value.trim());
    }

    return root;
}

function pushTreeDirective(
    processedLines: string[],
    nodes: TreeNode[],
    pushBlankLineIfNeeded: () => void,
    pushLine: (value: string) => void,
): void {
    const json = JSON.stringify(nodes);

    pushBlankLineIfNeeded();
    pushLine(':::tree');
    pushLine('```json');
    pushLine(json);
    pushLine('```');
    pushLine('');
    pushLine(':::');
}

function joinMultilineTreeTags(lines: string[]): string[] {
    const result: string[] = [];
    let index = 0;

    while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.trim();

        if (
            /^<Tree\.(Folder|File)(?:\s|$)/.test(trimmed) &&
            !trimmed.includes('>')
        ) {
            let accumulated = trimmed;
            index++;

            while (index < lines.length) {
                const nextTrimmed = lines[index].trim();
                index++;
                accumulated += ` ${nextTrimmed}`;

                if (
                    accumulated.trimEnd().endsWith('/>') ||
                    accumulated.trimEnd().endsWith('>')
                ) {
                    break;
                }
            }

            result.push(accumulated);

            continue;
        }

        result.push(line);
        index++;
    }

    return result;
}

function createTreeFolderNode(
    attrs: Record<string, string | boolean>,
): TreeNode {
    const node: TreeNode = {
        type: 'folder',
        name: typeof attrs.name === 'string' ? attrs.name : '',
        children: [],
    };

    if (attrs.defaultOpen === true) {
        node.defaultOpen = true;
    }

    if (attrs.openable === false) {
        node.openable = false;
    }

    return node;
}

function parseTreeContent(lines: string[]): TreeNode[] {
    const root: TreeNode[] = [];
    const stack: TreeNode[][] = [root];

    for (const line of joinMultilineTreeTags(lines)) {
        const trimmed = line.trim();

        if (!trimmed) {
            continue;
        }

        const folderSelfClose = /^<Tree\.Folder(?<attrs>[^>]*)\/\s*>$/.exec(
            trimmed,
        );

        if (folderSelfClose) {
            const attrs = parseJsxAttributes(
                folderSelfClose.groups?.attrs ?? '',
            );
            stack.at(-1)!.push(createTreeFolderNode(attrs));
            continue;
        }

        const folderOpen = /^<Tree\.Folder(?<attrs>[^>]*)>$/.exec(trimmed);

        if (folderOpen) {
            const attrs = parseJsxAttributes(folderOpen.groups?.attrs ?? '');
            const node = createTreeFolderNode(attrs);

            stack.at(-1)!.push(node);
            stack.push(node.children!);
            continue;
        }

        const fileNode = /^<Tree\.File(?<attrs>[^>]*)\/?\s*>$/.exec(trimmed);

        if (fileNode) {
            const attrs = parseJsxAttributes(fileNode.groups?.attrs ?? '');
            stack.at(-1)!.push({
                type: 'file',
                name: typeof attrs.name === 'string' ? attrs.name : '',
            });
            continue;
        }

        if (trimmed === '</Tree.Folder>') {
            if (stack.length > 1) {
                stack.pop();
            }
        }
    }

    return root;
}

function escapeDirectiveLabel(label: string): string {
    return label.replaceAll('\\', '\\\\').replaceAll(']', '\\]');
}

function replaceMintlifyBadges(line: string): string {
    return line.replace(
        /<Badge(?<attributes>[^>]*)>(?<content>.*?)<\/Badge>/g,
        (_, attributesSource: string, content: string) => {
            const attributes = parseJsxAttributes(attributesSource ?? '');
            const label = escapeDirectiveLabel(content.trim());

            return `:badge[${label}]${buildDirectiveAttributes(attributes)}`;
        },
    );
}

function replaceMintlifyTooltips(line: string): string {
    return line.replace(
        /<Tooltip(?<attributes>[^>]*)>(?<content>.*?)<\/Tooltip>/g,
        (_, attributesSource: string, content: string) => {
            const attributes = parseJsxAttributes(attributesSource ?? '');
            const label = escapeDirectiveLabel(content.trim());

            return `:tooltip[${label}]${buildDirectiveAttributes(attributes)}`;
        },
    );
}

export function preprocessMarkdownSyntax(markdown: string): string {
    return transformOutsideFences(preprocessMintlifySyntax(markdown), (line) =>
        replaceMintlifyTooltips(
            replaceMintlifyBadges(
                line
                    // Normalize :::message <type> to the attribute form remark-directive expects.
                    .replace(
                        new RegExp(
                            `:::message\\s+(${ZENN_MESSAGE_VARIANT_PATTERN})\\b`,
                        ),
                        ':::message{.$1}',
                    )
                    // Convert :::details title to the label form remark-directive expects.
                    .replace(/:::details\s+(.+?)$/, ':::details[$1]')
                    // Convert Zenn embeds to bare URL lines so remark-linkify-to-card picks them up.
                    .replace(
                        new RegExp(
                            `^@\\[(?:${ZENN_EMBED_DIRECTIVE_PATTERN})\\]\\((https?:\\/\\/[^\\s)]+)\\)$`,
                        ),
                        '$1',
                    ),
            ),
        ),
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
