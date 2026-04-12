import { MoveHorizontal, WrapText } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import type { ComponentPropsWithoutRef } from 'react';
import { useState } from 'react';
import type { ExtraProps } from 'react-markdown';

type CodeBlockProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const escapeHtml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isMobileViewport = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches;

export function CodeBlock({ className, children }: CodeBlockProps) {
    const [wrap, setWrap] = useState(isMobileViewport);

    const rawContent = String(children);
    const content = rawContent.replace(/\n$/, '');
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
        <div className="not-prose relative my-4 overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
            <button
                type="button"
                onClick={() => setWrap((v) => !v)}
                aria-label={
                    wrap
                        ? 'Enable horizontal scrolling'
                        : 'Enable line wrapping'
                }
                className="absolute top-2 right-2 rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
                title={wrap ? 'Scroll' : 'Wrap'}
            >
                {wrap ? <MoveHorizontal size={20} /> : <WrapText size={20} />}
            </button>
            <pre
                className={`bg-[#282c34] px-4 py-3 pr-10 font-mono text-sm text-gray-300 ${wrap ? 'break-words whitespace-pre-wrap' : 'overflow-x-auto'}`}
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
