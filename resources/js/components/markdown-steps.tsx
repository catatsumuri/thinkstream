import { type ReactNode } from 'react';

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
            className="steps-block not-prose my-6 ml-3.5 [counter-reset:step]"
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
            className="step-item relative flex items-start pb-5 [counter-increment:step] after:absolute after:top-[2.75rem] after:left-0 after:h-[calc(100%-2.75rem)] after:w-px after:bg-border after:content-[''] last:pb-0 last:after:hidden"
        >
            {/* Number badge */}
            <div className="absolute ml-[-13px] py-2">
                <div className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground before:content-[counter(step)]" />
            </div>

            {/* Content */}
            <div className="w-full overflow-hidden pl-8">
                {title && (
                    <p className="mt-2 text-sm font-semibold text-foreground">
                        {title}
                    </p>
                )}
                <div className="prose prose-sm mt-1 text-muted-foreground dark:prose-invert [&>p]:my-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
