import { Check, Copy, MoveHorizontal, WrapText } from 'lucide-react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { Fragment, lazy, Suspense, useMemo, useState } from 'react';
import type { ExtraProps } from 'react-markdown';
import type { ThemedToken } from 'shiki';
import { Skeleton } from '@/components/ui/skeleton';
import { useClipboard } from '@/hooks/use-clipboard';
import { useShikiHighlighter } from '@/hooks/use-shiki-highlighter';
import { tokenizeLines } from '@/lib/shiki';

type CodeBlockProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

function MermaidBlockLoadFallback() {
    return (
        <div className="not-prose my-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-200">
            Failed to load Mermaid diagram. Please refresh and try again.
        </div>
    );
}

const MermaidBlock = lazy(async () => {
    try {
        const module = await import('@/components/mermaid-block');

        return {
            default: module.MermaidBlock,
        };
    } catch {
        return {
            default: MermaidBlockLoadFallback,
        };
    }
});

/**
 * Renders one line of Shiki tokens. Theme colors live in the tokens' CSS
 * variables and are resolved by the .shiki-tokens rules in app.css, so the
 * enclosing element must carry the `shiki-tokens` class.
 */
export function ShikiTokenSpans({ tokens }: { tokens: ThemedToken[] }) {
    return (
        <>
            {tokens.map((token, index) => (
                <span key={index} style={token.htmlStyle as CSSProperties}>
                    {token.content}
                </span>
            ))}
        </>
    );
}

function HighlightedCode({
    lines,
    fallback,
}: {
    lines: ThemedToken[][] | null;
    fallback: string;
}) {
    if (!lines) {
        return fallback;
    }

    return lines.map((line, index) => (
        <Fragment key={index}>
            {index > 0 && '\n'}
            <ShikiTokenSpans tokens={line} />
        </Fragment>
    ));
}

/**
 * Parses the fenced code block info string to extract language, filename, and
 * whether this is a diff block.
 *
 * Supported formats:
 *   php:index.php          → language=php, filename=index.php, isDiff=false
 *   diff js:app.js         → language=js,  filename=app.js,   isDiff=true
 *   diff js                → language=js,  filename=null,     isDiff=true
 */
function parseCodeMeta(
    className: string | undefined,
    metastring: string | undefined,
): { language: string; filename: string | null; isDiff: boolean } {
    const normalizeLanguage = (value: string): string => value.toLowerCase();
    const rawLang = normalizeLanguage(
        /language-([\w-]+)/.exec(className ?? '')?.[1] ?? '',
    );
    let language = rawLang;
    let filename: string | null = null;
    let isDiff = false;

    if (rawLang === 'diff') {
        isDiff = true;
        // meta holds the real language (and optional filename): "js:app.js" or "js"
        const langPart = metastring?.split(/\s+/)[0] ?? '';

        if (langPart.includes(':')) {
            const [metaLanguage, metaFilename] = langPart.split(':') as [
                string,
                string,
            ];

            language = normalizeLanguage(metaLanguage);
            filename = metaFilename;
        } else {
            language = normalizeLanguage(langPart);
        }
    } else if (className?.includes(':')) {
        // className is "language-php:index.php" — colon separates lang from filename
        const afterPrefix = (className ?? '').replace(/^.*language-/, '');
        const colonIdx = afterPrefix.indexOf(':');

        language = normalizeLanguage(afterPrefix.slice(0, colonIdx));
        filename = afterPrefix.slice(colonIdx + 1);
    } else if (metastring) {
        // Fallback: meta carries "lang[:filename]"
        // Skip key=value tokens (e.g. tab=Pest) — they are metadata, not language names.
        const langPart = metastring.split(/\s+/)[0] ?? '';

        if (langPart.includes(':')) {
            const [metaLanguage, metaFilename] = langPart.split(':') as [
                string,
                string,
            ];

            language = normalizeLanguage(metaLanguage);
            filename = metaFilename;
        } else if (langPart && !langPart.includes('=')) {
            language = normalizeLanguage(langPart);
        }
    }

    return { language, filename, isDiff };
}

export function CodeBlock({
    className,
    children,
    node,
    metastring,
}: CodeBlockProps & { metastring?: string }) {
    const [wrap, setWrap] = useState(false);
    const [copied, setCopied] = useState(false);
    const [, copy] = useClipboard();
    const highlighter = useShikiHighlighter();

    const rawContent = String(children);
    const content = rawContent.replace(/\n$/, '');

    // react-markdown v10: fenced code blocks always have a trailing newline in children
    const isInline = !className && !rawContent.endsWith('\n');

    const codeMeta =
        metastring ?? (node?.properties?.metastring as string | undefined);
    const { language, filename, isDiff } = parseCodeMeta(className, codeMeta);

    const highlightedLines = useMemo(() => {
        if (!highlighter || isInline || isDiff || language === 'mermaid') {
            return null;
        }

        return tokenizeLines(highlighter, content, language);
    }, [highlighter, content, language, isInline, isDiff]);

    const diffRows = useMemo(() => {
        if (!isDiff) {
            return null;
        }

        return content.split('\n').map((line) => {
            let backgroundColor = 'transparent';
            let symbol = ' ';
            let code = line;

            if (line.startsWith('@@')) {
                backgroundColor = 'rgba(59,130,246,0.15)';
            } else if (line.startsWith('+')) {
                backgroundColor = 'rgba(16,185,129,0.15)';
                symbol = '+';
                code = line.slice(1);
            } else if (line.startsWith('-')) {
                backgroundColor = 'rgba(239,68,68,0.15)';
                symbol = '-';
                code = line.slice(1);
            } else if (line.startsWith(' ')) {
                code = line.slice(1);
            }

            const tokens =
                highlighter && code.trim()
                    ? (tokenizeLines(highlighter, code, language)?.[0] ?? null)
                    : null;

            return { backgroundColor, symbol, code, tokens };
        });
    }, [highlighter, content, language, isDiff]);

    if (isInline) {
        return (
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600 before:content-none after:content-none dark:bg-gray-800 dark:text-pink-400">
                {children}
            </code>
        );
    }

    if (language === 'mermaid') {
        return (
            <Suspense
                fallback={
                    <Skeleton className="not-prose my-4 h-40 rounded-lg" />
                }
            >
                <MermaidBlock code={content} />
            </Suspense>
        );
    }

    const handleCopy = async () => {
        let textToCopy = content;

        if (isDiff) {
            textToCopy = content
                .split('\n')
                .map((line) => {
                    if (
                        line.startsWith('+') ||
                        line.startsWith('-') ||
                        line.startsWith(' ')
                    ) {
                        return line.slice(1);
                    }

                    return line;
                })
                .join('\n');
        }

        const didCopy = await copy(textToCopy);

        if (!didCopy) {
            return;
        }

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const wrapToggleButton = (
        <button
            type="button"
            onClick={() => setWrap((v) => !v)}
            aria-label={
                wrap ? 'Enable horizontal scrolling' : 'Enable line wrapping'
            }
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={wrap ? 'Scroll' : 'Wrap'}
        >
            {wrap ? <MoveHorizontal size={16} /> : <WrapText size={16} />}
        </button>
    );

    const copyButton = (
        <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? 'Copied code to clipboard' : 'Copy code'}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Copy"
        >
            {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
    );

    // --- diff rendering ---
    if (isDiff && diffRows) {
        return (
            <div className="not-prose my-4 overflow-hidden rounded-lg border border-border bg-white dark:bg-[#24292e]">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 font-mono text-sm text-foreground">
                    <span>{filename ?? language}</span>
                    <div className="flex gap-1">
                        {wrapToggleButton}
                        {copyButton}
                    </div>
                </div>
                <div className={wrap ? '' : 'overflow-x-auto'}>
                    <pre className="my-0 font-mono text-sm text-[#24292e] dark:text-[#e1e4e8]">
                        <code>
                            {diffRows.map((row, index) => (
                                <div
                                    key={index}
                                    style={{
                                        backgroundColor: row.backgroundColor,
                                    }}
                                    className={`grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-1 px-4 py-0.5 ${wrap ? 'break-words whitespace-pre-wrap' : ''}`}
                                >
                                    <span
                                        className="text-center text-gray-500 select-none"
                                        aria-hidden="true"
                                    >
                                        {row.symbol}
                                    </span>
                                    <span className="shiki-tokens">
                                        {row.tokens ? (
                                            <ShikiTokenSpans
                                                tokens={row.tokens}
                                            />
                                        ) : (
                                            row.code
                                        )}
                                    </span>
                                </div>
                            ))}
                        </code>
                    </pre>
                </div>
            </div>
        );
    }

    // --- code block with filename header ---
    if (filename) {
        return (
            <div className="not-prose my-4 overflow-hidden rounded-lg border border-border bg-white dark:bg-[#24292e]">
                <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 font-mono text-sm text-foreground">
                    <span>{filename}</span>
                    <div className="flex gap-1">
                        {wrapToggleButton}
                        {copyButton}
                    </div>
                </div>
                <pre
                    className={`px-4 py-3 font-mono text-sm text-[#24292e] dark:text-[#e1e4e8] ${wrap ? 'break-words whitespace-pre-wrap' : 'overflow-x-auto'}`}
                    tabIndex={0}
                >
                    <code
                        className={`shiki-tokens${language ? ` language-${language}` : ''}`}
                    >
                        <HighlightedCode
                            lines={highlightedLines}
                            fallback={content}
                        />
                    </code>
                </pre>
            </div>
        );
    }

    // --- plain code block (existing behavior) ---
    return (
        <div className="not-prose relative my-4 overflow-hidden rounded-lg border border-border bg-white dark:bg-[#24292e]">
            <div className="absolute top-2 right-2 flex gap-1">
                <button
                    type="button"
                    onClick={() => setWrap((v) => !v)}
                    aria-label={
                        wrap
                            ? 'Enable horizontal scrolling'
                            : 'Enable line wrapping'
                    }
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={wrap ? 'Scroll' : 'Wrap'}
                >
                    {wrap ? (
                        <MoveHorizontal size={20} />
                    ) : (
                        <WrapText size={20} />
                    )}
                </button>
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label={
                        copied ? 'Copied code to clipboard' : 'Copy code'
                    }
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Copy"
                >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
            </div>
            <pre
                className={`px-4 py-3 pr-20 font-mono text-sm text-[#24292e] dark:text-[#e1e4e8] ${wrap ? 'break-words whitespace-pre-wrap' : 'overflow-x-auto'}`}
                tabIndex={0}
            >
                <code
                    className={`shiki-tokens${language ? ` language-${language}` : ''}`}
                >
                    <HighlightedCode
                        lines={highlightedLines}
                        fallback={content}
                    />
                </code>
            </pre>
        </div>
    );
}
