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

export function preprocessZennSyntax(markdown: string): string {
    return (
        markdown
            // Normalize :::message alert to the attribute form remark-directive expects.
            .replace(/:::message\s+alert\b/g, ':::message{.alert}')
            // Convert @[card](URL) to a bare URL line so remark-linkify-to-card picks it up.
            .replace(/^@\[card\]\((https?:\/\/[^\s)]+)\)$/gm, '$1')
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

            if (activeFence === null) {
                activeFence = fence;
            } else if (
                fence[0] === activeFence[0] &&
                fence.length >= activeFence.length
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
