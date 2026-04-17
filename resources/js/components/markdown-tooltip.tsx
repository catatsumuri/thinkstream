import type { ReactNode } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { sanitizeMarkdownCardHref } from '@/lib/markdown-card-href';

interface MarkdownTooltipProps {
    'data-tooltip-tip'?: string;
    'data-tooltip-headline'?: string;
    'data-tooltip-cta'?: string;
    'data-tooltip-href'?: string;
    children?: ReactNode;
}

export function MarkdownTooltip({
    'data-tooltip-tip': tip,
    'data-tooltip-headline': headline,
    'data-tooltip-cta': cta,
    'data-tooltip-href': href,
    children,
}: MarkdownTooltipProps) {
    if (!tip) {
        return <>{children}</>;
    }

    const safeHref = sanitizeMarkdownCardHref(href);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span
                    className="cursor-help border-b border-dashed border-current"
                    data-test="markdown-tooltip"
                >
                    {children}
                </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left">
                <div className="space-y-1">
                    {headline ? (
                        <p className="font-semibold">{headline}</p>
                    ) : null}
                    <p>{tip}</p>
                    {cta && safeHref ? (
                        <a
                            href={safeHref}
                            className="mt-1 block text-primary-foreground/80 underline hover:text-primary-foreground"
                        >
                            {cta}
                        </a>
                    ) : null}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
