import { ExternalLink, FileCode } from 'lucide-react';
import React from 'react';
import Prism, { ensurePrismLoaded } from '@/lib/prism';
import { parseGithubUrl } from '@/lib/url-matcher';

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

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

interface GithubEmbedProps {
    url: string;
}

export function GithubEmbed({ url }: GithubEmbedProps) {
    const info = React.useMemo(() => parseGithubUrl(url), [url]);
    const [lines, setLines] = React.useState<string[] | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);
    const [prismReady, setPrismReady] = React.useState(() => Boolean(Prism.languages.php));

    React.useEffect(() => {
        if (prismReady) {
            return;
        }

        let active = true;

        void ensurePrismLoaded().then(() => {
            if (active) {
                setPrismReady(true);
            }
        });

        return () => {
            active = false;
        };
    }, [prismReady]);

    React.useEffect(() => {
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
    const language = detectLanguage(info.path);
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
                className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-[#282c34]"
                data-test="embed-github"
            >
                <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <FileCode
                            size={14}
                            className="shrink-0 text-gray-400"
                        />
                        <div className="h-3.5 w-48 animate-pulse rounded bg-gray-600" />
                    </div>
                    <div className="h-3.5 w-24 animate-pulse rounded bg-gray-600" />
                </div>
                <div className="space-y-2 px-4 py-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-3 animate-pulse rounded bg-gray-700"
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
                className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-[#282c34]"
                data-test="embed-github"
            >
                <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
                    <div className="flex min-w-0 items-center gap-2 truncate font-mono text-xs text-gray-300">
                        <FileCode
                            size={14}
                            className="shrink-0 text-gray-400"
                        />
                        <span className="truncate">{headerLabel}</span>
                    </div>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 flex shrink-0 items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                    >
                        <ExternalLink size={12} />
                        View
                    </a>
                </div>
                <div className="px-4 py-3 font-mono text-xs text-gray-400">
                    Failed to load file content.
                </div>
            </div>
        );
    }

    const highlightedLines = lines.map((line) => {
        if (prismReady && language && Prism.languages[language]) {
            try {
                return Prism.highlight(
                    line,
                    Prism.languages[language],
                    language,
                );
            } catch {
                return escapeHtml(line);
            }
        }

        return escapeHtml(line);
    });

    return (
        <div
            className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-[#282c34]"
            data-test="embed-github"
        >
            <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
                <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-gray-300">
                    <FileCode size={14} className="shrink-0 text-gray-400" />
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-white hover:underline"
                        title={headerLabel}
                    >
                        {filename}
                    </a>
                    {lineLabel && (
                        <span className="text-gray-500">{lineLabel}</span>
                    )}
                </div>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 flex shrink-0 items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
                >
                    <ExternalLink size={12} />
                    {info.owner}/{info.repo}
                </a>
            </div>
            <div className="overflow-x-auto">
                <pre className="my-0 font-mono text-sm">
                    <code>
                        {highlightedLines.map((html, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start px-4 py-0.5 hover:bg-white/5"
                            >
                                <span
                                    className="pr-4 text-right text-xs text-gray-500 select-none"
                                    aria-hidden="true"
                                >
                                    {lineStart + index}
                                </span>
                                <span
                                    dangerouslySetInnerHTML={{ __html: html }}
                                />
                            </div>
                        ))}
                    </code>
                </pre>
            </div>
        </div>
    );
}
