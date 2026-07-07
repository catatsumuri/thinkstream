import { useEffect, useState } from 'react';
import type { Highlighter } from 'shiki';
import { getHighlighter } from '@/lib/shiki';

/**
 * Resolves the shared Shiki highlighter after mount; returns null until it
 * is ready so callers can render plain text as a fallback.
 */
export function useShikiHighlighter(): Highlighter | null {
    const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

    useEffect(() => {
        let active = true;

        void getHighlighter().then((instance) => {
            if (active) {
                setHighlighter(instance);
            }
        });

        return () => {
            active = false;
        };
    }, []);

    return highlighter;
}
