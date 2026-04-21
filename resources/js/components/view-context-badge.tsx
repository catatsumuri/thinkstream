import { cn } from '@/lib/utils';

const variants = {
    admin: 'border-slate-300/80 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200',
    site: 'border-emerald-300/80 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
} as const;

export default function ViewContextBadge({
    label,
    variant,
    className,
}: {
    label: string;
    variant: keyof typeof variants;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase',
                variants[variant],
                className,
            )}
        >
            {label}
        </span>
    );
}
