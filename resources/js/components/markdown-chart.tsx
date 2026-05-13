import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { getChartDomain, parseChart } from '@/lib/markdown-chart';

interface MarkdownChartProps {
    'data-chart'?: string;
}

export function MarkdownChart({ 'data-chart': json }: MarkdownChartProps) {
    const chart = parseChart(json);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const update = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        update();

        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    if (chart === null) {
        return null;
    }

    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const textColor = isDark ? '#9ca3af' : '#6b7280';
    const fillColor = isDark ? '#818cf8' : '#4f46e5';
    const strokeColor = isDark ? '#6366f1' : '#4338ca';

    const [domainMin, domainMax] = getChartDomain(chart);

    return (
        <div
            className="not-prose my-6 overflow-hidden rounded-2xl border border-border bg-background p-6"
            data-test="markdown-chart"
        >
            {chart.title ? (
                <p className="mb-4 text-center text-sm font-semibold text-foreground">
                    {chart.title}
                </p>
            ) : null}

            {chart.type === 'bar' ? (
                <ResponsiveContainer
                    width="100%"
                    height={chart.data.length * 44 + 60}
                >
                    <BarChart
                        layout="vertical"
                        data={chart.data}
                        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke={gridColor}
                        />
                        <XAxis
                            type="number"
                            domain={[domainMin, domainMax]}
                            tick={{ fill: textColor, fontSize: 12 }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="label"
                            width={96}
                            tick={{ fill: textColor, fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: isDark ? '#1f2937' : '#f3f4f6' }}
                            contentStyle={{
                                background: isDark ? '#111827' : '#ffffff',
                                border: `1px solid ${gridColor}`,
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: textColor,
                            }}
                        />
                        <Bar
                            dataKey="value"
                            fill={fillColor}
                            radius={[0, 4, 4, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <ResponsiveContainer width="100%" height={340}>
                    <RadarChart data={chart.data}>
                        <PolarGrid stroke={gridColor} />
                        <PolarAngleAxis
                            dataKey="label"
                            tick={{ fill: textColor, fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                            domain={[domainMin, domainMax]}
                            tick={{ fill: textColor, fontSize: 10 }}
                            axisLine={false}
                        />
                        <Radar
                            dataKey="value"
                            stroke={strokeColor}
                            fill={fillColor}
                            fillOpacity={0.35}
                        />
                        <Tooltip
                            contentStyle={{
                                background: isDark ? '#111827' : '#ffffff',
                                border: `1px solid ${gridColor}`,
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: textColor,
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
