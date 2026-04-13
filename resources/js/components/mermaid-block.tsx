import mermaid from 'mermaid';
import { useEffect, useId, useRef, useState } from 'react';

interface MermaidBlockProps {
    code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const renderId = useId().replace(/:/g, '');
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<'default' | 'dark'>('default');

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const updateTheme = () => {
            const isDark = document.documentElement.classList.contains('dark');
            setTheme(isDark ? 'dark' : 'default');
        };

        updateTheme();

        const observer = new MutationObserver(updateTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (!code.trim()) {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }

            return;
        }

        let cancelled = false;

        const render = async () => {
            try {
                setError(null);
                mermaid.initialize({
                    startOnLoad: false,
                    securityLevel: 'strict',
                    theme,
                });

                const { svg, bindFunctions } = await mermaid.render(
                    `${renderId}-${theme}`,
                    code,
                );

                if (cancelled) {
                    return;
                }

                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;

                    if (bindFunctions) {
                        bindFunctions(containerRef.current);
                    }
                }
            } catch (err) {
                if (cancelled) {
                    return;
                }

                const message =
                    err instanceof Error
                        ? err.message
                        : 'Failed to render mermaid diagram.';
                setError(message);
            }
        };

        render();

        return () => {
            cancelled = true;
        };
    }, [code, renderId, theme]);

    if (error) {
        return (
            <div className="not-prose my-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/60 dark:bg-red-950/40 dark:text-red-200">
                Mermaid render error: {error}
            </div>
        );
    }

    return (
        <div className="not-prose my-4 overflow-x-auto rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
            <div ref={containerRef} />
        </div>
    );
}
