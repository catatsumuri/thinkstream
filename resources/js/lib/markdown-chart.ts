export type ChartType = 'bar' | 'radar';

export type ChartDataPoint = {
    label: string;
    value: number;
};

export type ChartConfig = {
    type: ChartType;
    title?: string;
    min?: number;
    max?: number;
    data: ChartDataPoint[];
};

export function getChartDomain(chart: ChartConfig): [number, number] {
    const min = chart.min ?? 0;
    const max = chart.max ?? Math.max(...chart.data.map((point) => point.value));

    if (max <= min) {
        return [min, min + 1];
    }

    return [min, max];
}

function parseChartNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);

        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return undefined;
}

export function parseChart(json: string | undefined): ChartConfig | null {
    try {
        if (!json) {
            return null;
        }

        const raw = JSON.parse(json) as Partial<ChartConfig> & {
            data?: Array<Partial<ChartDataPoint>>;
        };

        if (raw.type !== 'bar' && raw.type !== 'radar') {
            return null;
        }

        const data: ChartDataPoint[] = [];

        if (Array.isArray(raw.data)) {
            for (const point of raw.data) {
                if (typeof point !== 'object' || point === null) {
                    continue;
                }

                const { label, value } = point as Partial<ChartDataPoint>;
                const parsedValue = parseChartNumber(value);

                if (
                    typeof label !== 'string' ||
                    label.trim() === '' ||
                    parsedValue === undefined
                ) {
                    continue;
                }

                data.push({
                    label: label.trim(),
                    value: parsedValue,
                });
            }
        }

        if (data.length === 0) {
            return null;
        }

        const min = parseChartNumber(raw.min);
        const max = parseChartNumber(raw.max);

        if (
            min !== undefined &&
            max !== undefined &&
            min > max
        ) {
            return null;
        }

        return {
            type: raw.type,
            title:
                typeof raw.title === 'string' && raw.title.trim() !== ''
                    ? raw.title.trim()
                    : undefined,
            min,
            max,
            data,
        };
    } catch {
        return null;
    }
}
