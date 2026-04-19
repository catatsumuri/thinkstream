export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
