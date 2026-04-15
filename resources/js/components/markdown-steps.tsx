import type { ReactNode } from 'react';

interface MarkdownStepsProps {
    children?: ReactNode;
}

interface MarkdownStepProps {
    'data-step-title'?: string;
    'data-step-icon'?: string;
    children?: ReactNode;
}

export function MarkdownSteps({ children }: MarkdownStepsProps) {
    return (
        <div
            role="list"
            className="steps-block not-prose ml-3.5 my-6 [counter-reset:step]"
            data-test="steps-block"
        >
            {children}
        </div>
    );
}

export function MarkdownStep({
    'data-step-title': title,
    children,
}: MarkdownStepProps) {
    return (
        <div
            role="listitem"
            className="step-item relative flex items-start pb-5 last:pb-0 [counter-increment:step]"
        >
            {/* Vertical connector line — hidden on the last step */}
            <div className="absolute w-px h-[calc(100%-2.75rem)] top-[2.75rem] bg-border last:hidden" />

            {/* Number badge */}
            <div className="absolute ml-[-13px] py-2">
                <div className="relative size-7 shrink-0 rounded-full bg-muted text-xs font-semibold text-foreground flex items-center justify-center before:content-[counter(step)]" />
            </div>

            {/* Content */}
            <div className="w-full overflow-hidden pl-8">
                {title && (
                    <p className="mt-2 font-semibold text-sm text-foreground">
                        {title}
                    </p>
                )}
                <div className="prose prose-sm dark:prose-invert mt-1 text-muted-foreground [&>p]:my-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
