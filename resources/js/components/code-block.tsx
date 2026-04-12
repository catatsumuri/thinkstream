import { Check, Copy, MoveHorizontal, WrapText } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';
import type { ExtraProps } from 'react-markdown';
import { useClipboard } from '@/hooks/use-clipboard';

type CodeBlockProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isMobileViewport = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches;

export function CodeBlock({ className, children }: CodeBlockProps) {
    const [wrap, setWrap] = useState(isMobileViewport);
    const [copied, setCopied] = useState(false);
    const [, copy] = useClipboard();

    const rawContent = String(children);
    const content = rawContent.replace(/\n$/, '');

    const handleCopy = async () => {
        const didCopy = await copy(content);

        if (!didCopy) {
            return;
        }

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const languageMatch = /language-(\w+)/.exec(className || '');
    const language = languageMatch?.[1] ?? '';
    // react-markdown v10: fenced code blocks always have a trailing newline in children
    const isInline = !className && !rawContent.endsWith('\n');

    if (isInline) {
        return (
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600 before:content-none after:content-none dark:bg-gray-800 dark:text-pink-400">
                {children}
            </code>
        );
    }

    const highlightLang = language === 'blade' ? 'html' : language;

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
