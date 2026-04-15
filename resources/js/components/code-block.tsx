import { Check, Copy, MoveHorizontal, WrapText } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';
import type { ExtraProps } from 'react-markdown';
import { MermaidBlock } from '@/components/mermaid-block';
import { useClipboard } from '@/hooks/use-clipboard';
import Prism from '@/lib/prism';

type CodeBlockProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isMobileViewport = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches;

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
    const rawLang = /language-(\w+)/.exec(className ?? '')?.[1] ?? '';
    let language = rawLang;
    let filename: string | null = null;
    let isDiff = false;

    if (rawLang === 'diff') {
        isDiff = true;
        // meta holds the real language (and optional filename): "js:app.js" or "js"
        const langPart = metastring?.split(/\s+/)[0] ?? '';

        if (langPart.includes(':')) {
            [language, filename] = langPart.split(':') as [string, string];
        } else {
            language = langPart;
        }
    } else if (className?.includes(':')) {
        // className is "language-php:index.php" — colon separates lang from filename
        const afterPrefix = (className ?? '').replace(/^.*language-/, '');
        const colonIdx = afterPrefix.indexOf(':');

        language = afterPrefix.slice(0, colonIdx);
        filename = afterPrefix.slice(colonIdx + 1);
    } else if (metastring) {
        // Fallback: meta carries "lang[:filename]"
        const langPart = metastring.split(/\s+/)[0] ?? '';

        if (langPart.includes(':')) {
            [language, filename] = langPart.split(':') as [string, string];
        } else if (langPart) {
            language = langPart;
        }
    }

    return { language, filename, isDiff };
}

export function CodeBlock({ className, children, node }: CodeBlockProps) {
    const [wrap, setWrap] = useState(isMobileViewport);
    const [copied, setCopied] = useState(false);
    const [, copy] = useClipboard();

    const rawContent = String(children);
    const content = rawContent.replace(/\n$/, '');

    // react-markdown v10: fenced code blocks always have a trailing newline in children
    const isInline = !className && !rawContent.endsWith('\n');

    if (isInline) {
        return (
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600 before:content-none after:content-none dark:bg-gray-800 dark:text-pink-400">
                {children}
            </code>
        );
    }

    const metastring = node?.properties?.metastring as string | undefined;
    const { language, filename, isDiff } = parseCodeMeta(className, metastring);
    const highlightLang = language === 'blade' ? 'html' : language;

    if (highlightLang === 'mermaid') {
        return <MermaidBlock code={content} />;
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
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
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
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
            title="Copy"
        >
            {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
    );

    // --- diff rendering ---
    if (isDiff) {
        const prismLanguage =
            highlightLang && Prism.languages[highlightLang]
                ? Prism.languages[highlightLang]
                : null;

        return (
            <div className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-[#282c34]">
                <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300">
                    <span>{filename ?? language}</span>
                    <div className="flex gap-1">
                        {wrapToggleButton}
                        {copyButton}
                    </div>
                </div>
                <div className={wrap ? '' : 'overflow-x-auto'}>
                    <pre className="my-0 font-mono text-sm">
                        <code>
                            {content.split('\n').map((line, index) => {
                                let bgColor = 'transparent';
                                let symbol = ' ';
                                let codeContent = line;

                                if (line.startsWith('@@')) {
                                    bgColor = 'rgba(59,130,246,0.15)';
                                    symbol = ' ';
                                    codeContent = line;
                                } else if (line.startsWith('+')) {
                                    bgColor = 'rgba(16,185,129,0.15)';
                                    symbol = '+';
                                    codeContent = line.slice(1);
                                } else if (line.startsWith('-')) {
                                    bgColor = 'rgba(239,68,68,0.15)';
                                    symbol = '-';
                                    codeContent = line.slice(1);
                                } else if (line.startsWith(' ')) {
                                    symbol = ' ';
                                    codeContent = line.slice(1);
                                }

                                let highlightedHtml = escapeHtml(codeContent);

                                if (prismLanguage && codeContent.trim()) {
                                    try {
                                        highlightedHtml = Prism.highlight(
                                            codeContent,
                                            prismLanguage,
                                            highlightLang,
                                        );
                                    } catch {
                                        // fall back to escaped plain text
                                    }
                                }

                                return (
                                    <div
                                        key={index}
                                        style={{ backgroundColor: bgColor }}
                                        className={`grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-1 px-4 py-0.5 ${wrap ? 'break-words whitespace-pre-wrap' : ''}`}
                                    >
                                        <span
                                            className="text-center text-gray-500 select-none"
                                            aria-hidden="true"
                                        >
                                            {symbol}
                                        </span>
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: highlightedHtml,
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </code>
                    </pre>
                </div>
            </div>
        );
    }

    // --- code block with filename header ---
    if (filename) {
        return (
            <div className="not-prose my-4 overflow-hidden rounded-lg border border-gray-700 bg-[#282c34]">
                <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2 font-mono text-sm text-gray-300">
                    <span>{filename}</span>
                    <div className="flex gap-1">
                        {wrapToggleButton}
                        {copyButton}
                    </div>
                </div>
                <pre
                    className={`px-4 py-3 font-mono text-sm text-gray-300 ${wrap ? 'break-words whitespace-pre-wrap' : 'overflow-x-auto'}`}
                    style={{ background: '#282c34' }}
                >
                    <code
                        className={
                            highlightLang
                                ? `language-${highlightLang}`
                                : undefined
                        }
                        style={{ background: 'transparent' }}
                        dangerouslySetInnerHTML={{
                            __html:
                                highlightLang && Prism.languages[highlightLang]
                                    ? Prism.highlight(
                                          content,
                                          Prism.languages[highlightLang],
                                          highlightLang,
                                      )
                                    : escapeHtml(content),
                        }}
                    />
                </pre>
            </div>
        );
    }

    // --- plain code block (existing behavior) ---
    return (
        <div className="not-prose relative my-4 overflow-hidden rounded-lg border border-gray-700 bg-[#282c34]">
            <div className="absolute top-2 right-2 flex gap-1">
                <button
                    type="button"
                    onClick={() => setWrap((v) => !v)}
                    aria-label={
                        wrap
                            ? 'Enable horizontal scrolling'
                            : 'Enable line wrapping'
                    }
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
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
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
                    title="Copy"
                >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
            </div>
            <pre
                className={`px-4 py-3 pr-20 font-mono text-sm text-gray-300 ${wrap ? 'break-words whitespace-pre-wrap' : 'overflow-x-auto'}`}
                style={{ background: '#282c34' }}
            >
                <code
                    className={
                        highlightLang ? `language-${highlightLang}` : undefined
                    }
                    style={{
                        background: 'transparent',
                        ...(wrap
                            ? {
                                  whiteSpace: 'pre-wrap',
                                  overflowWrap: 'break-word',
                              }
                            : {}),
                    }}
                    dangerouslySetInnerHTML={{
                        __html:
                            highlightLang && Prism.languages[highlightLang]
                                ? Prism.highlight(
                                      content,
                                      Prism.languages[highlightLang],
                                      highlightLang,
                                  )
                                : escapeHtml(content),
                    }}
                />
            </pre>
        </div>
    );
}
