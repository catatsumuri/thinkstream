export type HeadingIdDispenser = (baseId: string, self: object) => string;

export function createHeadingIdDispenser(): HeadingIdDispenser {
    const idCounts = new Map<string, number>();
    const assignedIds = new WeakMap<object, string>();

    return (baseId: string, self: object): string => {
        const existingId = assignedIds.get(self);

        if (existingId) {
            return existingId;
        }

        const count = (idCounts.get(baseId) ?? 0) + 1;
        const id = count === 1 ? baseId : `${baseId}-${count}`;

        idCounts.set(baseId, count);
        assignedIds.set(self, id);

        return id;
    };
}
