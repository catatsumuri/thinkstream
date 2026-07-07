import { parseGithubUrl } from '@catatsumuri/inkstream/syntax';
import { ExternalLink, FileCode } from 'lucide-react';
import React from 'react';
import { ShikiTokenSpans } from '@/components/code-block';
import { useShikiHighlighter } from '@/hooks/use-shiki-highlighter';
import { tokenizeLines } from '@/lib/shiki';

/** Maximum number of lines to display when no line range is specified. */
const MAX_LINES = 200;

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    php: 'php',
    py: 'python',
    css: 'css',
    json: 'json',
    sh: 'bash',
    bash: 'bash',
    html: 'html',
    htm: 'html',
    md: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
};

function detectLanguage(path: string): string {
    const ext = path.split('.').at(-1)?.toLowerCase() ?? '';

    return EXTENSION_TO_LANGUAGE[ext] ?? ext;
}

interface GithubEmbedProps {
    url: string;
}

export function GithubEmbed({ url }: GithubEmbedProps) {
    const info = React.useMemo(() => parseGithubUrl(url), [url]);
    const [lines, setLines] = React.useState<string[] | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);
    const highlighter = useShikiHighlighter();
    const language = info ? detectLanguage(info.path) : '';

    // Tokenize the fetched lines as one block so multi-line constructs keep
    // their grammar context; the result stays line-aligned with `lines`.
    const tokenLines = React.useMemo(
        () =>
            highlighter && lines
                ? tokenizeLines(highlighter, lines.join('\n'), language)
                : null,
        [highlighter, lines, language],
    );

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLines(null);
        setError(false);
        setLoading(true);

        if (!info) {
            setError(true);
            setLoading(false);

            return;
        }

        const rawUrl = `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${info.path}`;

        const fetchContent = async () => {
            try {
                const response = await fetch(rawUrl);

                if (!response.ok) {
                    setError(true);

                    return;
                }

                const text = await response.text();
                const allLines = text.split('\n');

                const start = info.lineStart ?? 1;
                const end = info.lineEnd ?? info.lineStart ?? null;

                if (end !== null) {
                    setLines(allLines.slice(start - 1, end));
                } else if (info.lineStart !== undefined) {
                    setLines(allLines.slice(start - 1, start));
                } else {
                    setLines(allLines.slice(0, MAX_LINES));
                }
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        void fetchContent();
    }, [info]);

    if (!info) {
        return (
            <div className="not-prose my-4" data-test="embed-github">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                >
                    {url}
                </a>
            </div>
        );
    }

    const filename = info.path.split('/').at(-1) ?? info.path;
    const lineStart = info.lineStart ?? 1;

    const lineLabel =
        info.lineStart !== undefined
            ? info.lineEnd !== undefined
                ? `L${info.lineStart}–L${info.lineEnd}`
                : `L${info.lineStart}`
            : null;

    const headerLabel = `${info.owner}/${info.repo}/${info.path}${lineLabel ? ` (${lineLabel})` : ''}`;

    if (loading) {
        return (
            <div
                className="not-prose my-4 overflow-hidden rounded-lg border border-border bg-card"
                data-test="embed-github"
            >
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <FileCode
                            size={14}
                            className="shrink-0 text-muted-foreground"
                        />
                        <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-2 px-4 py-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-3 animate-pulse rounded bg-muted"
                            style={{ width: `${60 + (i % 3) * 15}%` }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (error || lines === null) {
        return (
            <div
                className="not-prose my-4 overflow-hidden rounded-lg border border-border bg-card"
                data-test="embed-github"
            >
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2 truncate font-mono text-xs text-foreground">
                        <FileCode
                            size={14}
                            className="shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">{headerLabel}</span>
                    </div>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-test="embed-github-open-link"
                        className="ml-3 flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                        <ExternalLink size={12} />
                        View
                    </a>
                </div>
                <div className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    Failed to load file content.
                </div>
            </div>
        );
    }

    return (
        <div
            className="not-prose my-4 overflow-hidden rounded-lg border border-border bg-card"
            data-test="embed-github"
        >
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-foreground">
                    <FileCode
                        size={14}
                        className="shrink-0 text-muted-foreground"
                    />
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-foreground hover:underline"
                        title={headerLabel}
                    >
                        {filename}
                    </a>
                    {lineLabel && (
                        <span className="text-muted-foreground">
                            {lineLabel}
                        </span>
                    )}
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-test="embed-github-repo-link"
                    className="ml-3 flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                    <ExternalLink size={12} />
                    {info.owner}/{info.repo}
                </a>
            </div>
            <div
                className="max-h-[32rem] overflow-auto overscroll-contain bg-white dark:bg-[#24292e]"
                data-test="embed-github-scroll"
            >
                <pre
                    className="my-0 min-w-max font-mono text-sm text-[#24292e] dark:text-[#e1e4e8]"
                    data-test="embed-github-code"
                >
                    <code>
                        {lines.map((line, index) => {
                            const tokens = tokenLines?.[index];

                            return (
                                <div
                                    key={index}
                                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start px-4 py-0.5 hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <span
                                        className="pr-4 text-right text-xs text-gray-500 select-none"
                                        aria-hidden="true"
                                    >
                                        {lineStart + index}
                                    </span>
                                    <span className="shiki-tokens">
                                        {tokens ? (
                                            <ShikiTokenSpans tokens={tokens} />
                                        ) : (
                                            line
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </code>
                </pre>
            </div>
        </div>
    );
}
