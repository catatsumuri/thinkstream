export function matchesDeleteConfirmation(
    value: string,
    expected: string,
): boolean {
    return value.trim() === expected.trim();
}
