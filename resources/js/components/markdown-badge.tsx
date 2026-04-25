import { type ReactNode } from 'react';
import { getLucideIcon, SimpleIconSvg } from '@/components/markdown-card-group';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { getSimpleIcon } from '@/lib/simple-icon-lookup';
import { cn } from '@/lib/utils';

const BADGE_COLOR_STYLES = {
    gray: {
        solid: 'border-transparent bg-muted text-foreground',
        stroke: 'border-border bg-transparent text-muted-foreground',
    },
    blue: {
        solid: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200',
        stroke: 'border-blue-200 bg-transparent text-blue-700 dark:border-blue-800 dark:text-blue-300',
    },
    green: {
        solid: 'border-transparent bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-200',
        stroke: 'border-green-200 bg-transparent text-green-700 dark:border-green-800 dark:text-green-300',
    },
    yellow: {
        solid: 'border-transparent bg-yellow-100 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200',
        stroke: 'border-yellow-200 bg-transparent text-yellow-800 dark:border-yellow-800 dark:text-yellow-300',
    },
    orange: {
        solid: 'border-transparent bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
        stroke: 'border-orange-200 bg-transparent text-orange-700 dark:border-orange-800 dark:text-orange-300',
    },
    red: {
        solid: 'border-transparent bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200',
        stroke: 'border-red-200 bg-transparent text-red-700 dark:border-red-800 dark:text-red-300',
    },
    purple: {
        solid: 'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-200',
        stroke: 'border-purple-200 bg-transparent text-purple-700 dark:border-purple-800 dark:text-purple-300',
    },
    white: {
        solid: 'border-slate-200 bg-white text-slate-900',
        stroke: 'border-slate-300 bg-transparent text-slate-100 dark:text-slate-200',
    },
    surface: {
        solid: 'border-border bg-background text-foreground',
        stroke: 'border-border bg-transparent text-foreground',
    },
    'white-destructive': {
        solid: 'border-red-200 bg-white text-red-700',
        stroke: 'border-red-300 bg-transparent text-red-600 dark:text-red-300',
    },
    'surface-destructive': {
        solid: 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
        stroke: 'border-red-300 bg-transparent text-red-700 dark:text-red-300',
    },
} as const;

const BADGE_SIZE_STYLES = {
    xs: 'px-1.5 py-0 text-[10px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
} as const;

const BADGE_SHAPE_STYLES = {
    rounded: 'rounded-md',
    pill: 'rounded-full',
} as const;

function resolveBoolean(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value !== '' && value !== 'false' && value !== '0';
    }

    return false;
}

interface MarkdownBadgeProps {
    'data-badge-color'?: string;
    'data-badge-size'?: string;
    'data-badge-shape'?: string;
    'data-badge-icon'?: string;
    'data-badge-stroke'?: string | boolean;
    'data-badge-disabled'?: string | boolean;
    children?: ReactNode;
}

export function MarkdownBadge({
    'data-badge-color': color = 'gray',
    'data-badge-size': size = 'md',
    'data-badge-shape': shape = 'rounded',
    'data-badge-icon': icon,
    'data-badge-stroke': stroke,
    'data-badge-disabled': disabled,
    children,
}: MarkdownBadgeProps) {
    const badgeColor =
        BADGE_COLOR_STYLES[color as keyof typeof BADGE_COLOR_STYLES] ??
        BADGE_COLOR_STYLES.gray;
    const badgeSize =
        BADGE_SIZE_STYLES[size as keyof typeof BADGE_SIZE_STYLES] ??
        BADGE_SIZE_STYLES.md;
    const badgeShape =
        BADGE_SHAPE_STYLES[shape as keyof typeof BADGE_SHAPE_STYLES] ??
        BADGE_SHAPE_STYLES.rounded;
    const isStroke = resolveBoolean(stroke);
    const isDisabled = resolveBoolean(disabled);
    const lucideIcon = getLucideIcon(icon);
    const simpleIcon = !lucideIcon ? getSimpleIcon(icon) : undefined;

    return (
        <Badge
            data-test="markdown-badge"
            className={cn(
                'not-prose align-middle font-medium shadow-none',
                badgeSize,
                badgeShape,
                isStroke ? badgeColor.stroke : badgeColor.solid,
                isDisabled && 'cursor-not-allowed opacity-50',
            )}
        >
            {lucideIcon ? (
                <Icon iconNode={lucideIcon} className="size-3.5" />
            ) : simpleIcon ? (
                <SimpleIconSvg icon={simpleIcon} className="size-3.5" />
            ) : null}
            {children}
        </Badge>
    );
}
