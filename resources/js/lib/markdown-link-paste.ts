import { isAbsoluteUrl } from './markdown-syntax.js';

type MarkdownLinkPasteInput = {
    currentValue: string;
    pastedText: string;
    selectionStart: number;
    selectionEnd: number;
};

type MarkdownLinkPasteResult = {
    nextValue: string;
    nextSelectionStart: number;
    nextSelectionEnd: number;
};

export function getMarkdownLinkPasteResult({
    currentValue,
    pastedText,
    selectionStart,
    selectionEnd,
}: MarkdownLinkPasteInput): MarkdownLinkPasteResult | null {
    const normalizedText = pastedText.trim();

    if (selectionStart === selectionEnd || !isAbsoluteUrl(normalizedText)) {
        return null;
    }

    const selectedText = currentValue.slice(selectionStart, selectionEnd);
    const markdownLink = `[${selectedText}](${normalizedText})`;

    return {
        nextValue:
            currentValue.slice(0, selectionStart) +
            markdownLink +
            currentValue.slice(selectionEnd),
        nextSelectionStart: selectionStart + markdownLink.length,
        nextSelectionEnd: selectionStart + markdownLink.length,
    };
}
