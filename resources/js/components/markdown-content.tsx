import { AlertTriangle, CircleCheck, Info, Lightbulb } from 'lucide-react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import {
    defListHastHandlers,
    remarkDefinitionList,
} from 'remark-definition-list';
import remarkDirective from 'remark-directive';
import remarkEmoji from 'remark-emoji';
import remarkGfm from 'remark-gfm';
import remarkSupersub from 'remark-supersub';
import { EmbedCard } from '@/components/embed-card';
import {
    MarkdownCard,
    MarkdownCardGroup,
} from '@/components/markdown-card-group';
import {
    MarkdownParamField,
    MarkdownResponseField,
} from '@/components/markdown-api-fields';
import { MarkdownStep, MarkdownSteps } from '@/components/markdown-steps';
import { MarkdownTab, MarkdownTabs } from '@/components/markdown-tabs';
import {
    preprocessMarkdownContent,
    preprocessMarkdownSyntax,
} from '@/lib/markdown-syntax';
import { remarkCardDirective } from '@/lib/remark-card-directive';
import { remarkApiFieldsDirective } from '@/lib/remark-api-fields-directive';
import { remarkBadgeDirective } from '@/lib/remark-badge-directive';
import { remarkCodeGroupDirective } from '@/lib/remark-code-group-directive';
import { MarkdownBadge } from '@/components/markdown-badge';
import { MarkdownCodeGroup } from '@/components/markdown-code-group';
import { remarkStepsDirective } from '@/lib/remark-steps-directive';
import { remarkCodeMeta } from '@/lib/remark-code-meta';
import { remarkLinkifyToCard } from '@/lib/remark-linkify-to-card';
import { remarkMark } from '@/lib/remark-mark';
import { remarkTabsDirective } from '@/lib/remark-tabs-directive';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { cn } from '@/lib/utils';

function DetailsBox({
    children,
    ...props
}: React.ComponentPropsWithoutRef<'details'>) {
    return (
        <details
            className="details-block not-prose my-4 rounded-md border border-border text-sm"
            data-test="details-block"
            {...props}
        >
            {children}
        </details>
    );
}

function SummaryEl({
    children,
    ...props
}: React.ComponentPropsWithoutRef<'summary'>) {
    return (
        <summary
            className="cursor-pointer rounded-md bg-muted px-4 py-2 leading-relaxed font-medium select-none"
            {...props}
        >
            {children}
        </summary>
    );
}

const CALLOUT_CONFIG = {
    note: {
        Icon: Info,
        bg: 'bg-gray-50 dark:bg-gray-900/40',
        text: 'text-gray-800 dark:text-gray-200',
        iconColor: 'text-gray-500',
    },
    tip: {
        Icon: Lightbulb,
        bg: 'bg-green-50 dark:bg-green-950/40',
        text: 'text-green-900 dark:text-green-100',
        iconColor: 'text-green-500',
    },
    info: {
        Icon: Info,
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-900 dark:text-blue-100',
        iconColor: 'text-blue-500',
    },
    alert: {
        Icon: AlertTriangle,
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-900 dark:text-amber-100',
        iconColor: 'text-amber-500',
    },
    check: {
        Icon: CircleCheck,
        bg: 'bg-green-50 dark:bg-green-950/40',
        text: 'text-green-900 dark:text-green-100',
        iconColor: 'text-green-500',
    },
} as const;

type CalloutType = keyof typeof CALLOUT_CONFIG;

function MessageBox({
    children,
    className,
    ...props
}: React.ComponentPropsWithoutRef<'aside'>) {
    if (!className?.includes('msg')) {
        return (
            <aside className={className} {...props}>
                {children}
            </aside>
        );
    }

    const classes = className.split(/\s+/);
    const typeKey =
        (classes.find((c) => c in CALLOUT_CONFIG) as CalloutType | undefined) ??
        'info';
    const { Icon, bg, text, iconColor } = CALLOUT_CONFIG[typeKey];

    return (
        <aside
            className={cn(
                'not-prose my-6 flex items-start gap-3 rounded-md px-4 py-4 text-sm leading-relaxed',
                bg,
                text,
                className,
            )}
            {...props}
        >
            <Icon className={cn('mt-0.5 shrink-0', iconColor)} size={18} />
            <div className="min-w-0 flex-1">{children}</div>
        </aside>
    );
}

type MarkdownContentProps = {
    content: string;
    components?: Components;
};

export default function MarkdownContent({
    content,
    components,
}: MarkdownContentProps) {
    const markdownComponents: Components & {
        tabs?: (props: Record<string, unknown>) => React.ReactElement;
        tab?: (props: Record<string, unknown>) => React.ReactElement;
        card?: (props: Record<string, unknown>) => React.ReactElement;
        cardgroup?: (props: Record<string, unknown>) => React.ReactElement;
        steps?: (props: Record<string, unknown>) => React.ReactElement;
        step?: (props: Record<string, unknown>) => React.ReactElement;
        responsefield?: (props: Record<string, unknown>) => React.ReactElement;
        paramfield?: (props: Record<string, unknown>) => React.ReactElement;
        codegroup?: (props: Record<string, unknown>) => React.ReactElement;
        badge?: (props: Record<string, unknown>) => React.ReactElement;
    } = {
        pre: ({ children }) => <>{children}</>,
        aside: MessageBox,
        details: DetailsBox,
        summary: SummaryEl,
        tabs: (props: Record<string, unknown>) => <MarkdownTabs {...props} />,
        tab: (props: Record<string, unknown>) => <MarkdownTab {...props} />,
        card: (props: Record<string, unknown>) => (
            <MarkdownCard {...(props as Parameters<typeof MarkdownCard>[0])} />
        ),
        cardgroup: (props: Record<string, unknown>) => (
            <MarkdownCardGroup
                {...(props as Parameters<typeof MarkdownCardGroup>[0])}
            />
        ),
        steps: (props: Record<string, unknown>) => (
            <MarkdownSteps
                {...(props as Parameters<typeof MarkdownSteps>[0])}
            />
        ),
        step: (props: Record<string, unknown>) => (
            <MarkdownStep {...(props as Parameters<typeof MarkdownStep>[0])} />
        ),
        responsefield: (props: Record<string, unknown>) => (
            <MarkdownResponseField
                {...(props as Parameters<typeof MarkdownResponseField>[0])}
            />
        ),
        paramfield: (props: Record<string, unknown>) => (
            <MarkdownParamField
                {...(props as Parameters<typeof MarkdownParamField>[0])}
            />
        ),
        codegroup: (props: Record<string, unknown>) => (
            <MarkdownCodeGroup
                {...(props as Parameters<typeof MarkdownCodeGroup>[0])}
            />
        ),
        badge: (props: Record<string, unknown>) => (
            <MarkdownBadge
                {...(props as Parameters<typeof MarkdownBadge>[0])}
            />
        ),
        dl: ({ node, ...props }) => {
            void node;

            return <dl className="my-4 space-y-1" {...props} />;
        },
        dt: ({ node, ...props }) => {
            void node;

            return <dt className="font-semibold" {...props} />;
        },
        dd: ({ node, ...props }) => {
            void node;

            return <dd className="ml-4 text-muted-foreground" {...props} />;
        },
        div: (props: React.ComponentPropsWithoutRef<'div'>) => {
            const embedType = (props as Record<string, unknown>)[
                'data-embed-type'
            ] as 'youtube' | 'card' | 'github' | undefined;
            const embedUrl = (props as Record<string, unknown>)[
                'data-embed-url'
            ] as string | undefined;

            if (embedType && embedUrl) {
                return <EmbedCard type={embedType} url={embedUrl} />;
            }

            return <div {...props} />;
        },
        ...components,
    };

    return (
        <ReactMarkdown
            remarkPlugins={[
                [remarkGfm, { singleTilde: false }],
                remarkCodeMeta,
                remarkDirective,
                remarkZennDirective,
                remarkTabsDirective,
                remarkCardDirective,
                remarkStepsDirective,
                remarkApiFieldsDirective,
                remarkBadgeDirective,
                remarkCodeGroupDirective,
                remarkLinkifyToCard,
                remarkSupersub,
                remarkDefinitionList,
                remarkEmoji,
                remarkMark,
            ]}
            remarkRehypeOptions={{
                handlers: {
                    ...defListHastHandlers,
                    mark: (state: any, node: any) => ({
                        type: 'element' as const,
                        tagName: 'mark',
                        properties: {},
                        children: state.all(node),
                    }),
                } as any,
            }}
            components={markdownComponents}
        >
            {preprocessMarkdownContent(preprocessMarkdownSyntax(content))}
        </ReactMarkdown>
    );
}
