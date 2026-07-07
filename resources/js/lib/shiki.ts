import type { Highlighter, ThemedToken } from 'shiki';

/**
 * Both themes are emitted per token as CSS variables (--shiki-light /
 * --shiki-dark) because defaultColor is disabled; resources/css/app.css
 * switches between them via the `.dark` class. Keep the theme pair in sync
 * with yomitoki's lib/highlighter.ts until the shared markdown-kit package
 * replaces both.
 */
export const SHIKI_THEMES = {
    light: 'github-light',
    dark: 'github-dark',
} as const;

const SHIKI_LANGUAGES = [
    'bash',
    'blade',
    'css',
    'html',
    'javascript',
    'json',
    'jsx',
    'markdown',
    'php',
    'python',
    'sql',
    'tsx',
    'typescript',
    'yaml',
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

/**
 * Lazily creates the app-wide highlighter singleton. Shiki is loaded via
 * dynamic import so it stays out of the main bundle and never runs during
 * SSR module evaluation.
 */
export function getHighlighter(): Promise<Highlighter> {
    if (!highlighterPromise) {
        highlighterPromise = import('shiki').then(({ createHighlighter }) =>
            createHighlighter({
                themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
                langs: [...SHIKI_LANGUAGES],
            }),
        );
    }

    return highlighterPromise;
}

type TokenizableLanguage = Parameters<Highlighter['codeToTokens']>[1]['lang'];

/**
 * Tokenizes code into per-line themed tokens, or null when the language is
 * not part of the loaded grammar set (callers render plain text instead).
 * Aliases registered by the grammars (js, ts, py, sh, yml, ...) resolve too.
 */
export function tokenizeLines(
    highlighter: Highlighter,
    code: string,
    language: string,
): ThemedToken[][] | null {
    if (!highlighter.getLoadedLanguages().includes(language)) {
        return null;
    }

    try {
        return highlighter.codeToTokens(code, {
            lang: language as TokenizableLanguage,
            themes: SHIKI_THEMES,
            defaultColor: false,
        }).tokens;
    } catch {
        return null;
    }
}
