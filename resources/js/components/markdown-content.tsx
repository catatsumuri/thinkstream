import { AlertTriangle, CircleCheck, Info, Lightbulb } from 'lucide-react';
import type { Components } from 'react-markdown';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
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
    MarkdownParamField,
    MarkdownResponseField,
} from '@/components/markdown-api-fields';
import { MarkdownBadge } from '@/components/markdown-badge';
import {
    MarkdownCard,
    MarkdownCardGroup,
} from '@/components/markdown-card-group';
import { MarkdownCodeGroup } from '@/components/markdown-code-group';
import { MarkdownQuiz } from '@/components/markdown-quiz';
import { MarkdownStep, MarkdownSteps } from '@/components/markdown-steps';
import { MarkdownTab, MarkdownTabs } from '@/components/markdown-tabs';
import { MarkdownTooltip } from '@/components/markdown-tooltip';
import { MarkdownTree } from '@/components/markdown-tree';
import { MarkdownUpdate } from '@/components/markdown-update';
import { HeadingIdContext } from '@/lib/markdown-components';
import { createHeadingIdDispenser } from '@/lib/markdown-heading-ids';
import {
    preprocessMarkdownContent,
    preprocessMarkdownSyntax,
} from '@/lib/markdown-syntax';
import { remarkApiFieldsDirective } from '@/lib/remark-api-fields-directive';
import { remarkBadgeDirective } from '@/lib/remark-badge-directive';
import { remarkCardDirective } from '@/lib/remark-card-directive';
import { remarkCodeGroupDirective } from '@/lib/remark-code-group-directive';
import { remarkCodeMeta } from '@/lib/remark-code-meta';
import { remarkFallbackDirective } from '@/lib/remark-fallback-directive';
import { remarkFixUrlPorts } from '@/lib/remark-fix-url-ports';
import { remarkLinkifyToCard } from '@/lib/remark-linkify-to-card';
import { remarkMark } from '@/lib/remark-mark';
import { remarkQuizDirective } from '@/lib/remark-quiz-directive';
import { remarkStepsDirective } from '@/lib/remark-steps-directive';
import { remarkTabsDirective } from '@/lib/remark-tabs-directive';
import { remarkTooltipDirective } from '@/lib/remark-tooltip-directive';
import { remarkTreeDirective } from '@/lib/remark-tree-directive';
import { remarkUpdateDirective } from '@/lib/remark-update-directive';
import { remarkWikilinks } from '@/lib/remark-wikilinks';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { cn } from '@/lib/utils';

function DetailsBox({
    children,
    ...props
}: React.ComponentPropsWithoutRef<'details'>) {
    return (
        <details
            className="details-block my-6 rounded-md border border-border"
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
            className="not-prose cursor-pointer rounded-md bg-muted px-4 py-2 text-sm leading-relaxed font-medium select-none"
            {...props}
        >
            {children}
        </summary>
    );
}

type CalloutType = keyof typeof CALLOUT_CONFIG;

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
            <div className="min-w-0 flex-1 [&_h1]:mb-2 [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:font-semibold [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-4 [&_p:not(:last-child)]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-4">
                {children}
            </div>
        </aside>
    );
}

type MarkdownContentProps = {
    content: string;
    components?: Components;
    resolveWikilink?: (path: string) => string;
};

export default function MarkdownContent({
    content,
    components,
    resolveWikilink,
}: MarkdownContentProps) {
    const resolveWikilinkFn = resolveWikilink ?? ((path: string) => `/${path}`);
    const dispenseHeadingId = createHeadingIdDispenser();

    const customMarkdownComponents = {
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
        tooltip: (props: Record<string, unknown>) => (
            <MarkdownTooltip
                {...(props as Parameters<typeof MarkdownTooltip>[0])}
            />
        ),
        update: (props: Record<string, unknown>) => (
            <MarkdownUpdate
                {...(props as Parameters<typeof MarkdownUpdate>[0])}
            />
        ),
        tree: (props: Record<string, unknown>) => (
            <MarkdownTree {...(props as Parameters<typeof MarkdownTree>[0])} />
        ),
    } satisfies Record<
        string,
        (props: Record<string, unknown>) => React.ReactElement
    >;

    const markdownComponents: Components &
        Partial<typeof customMarkdownComponents> = {
        pre: ({ children }) => <>{children}</>,
        aside: MessageBox,
        details: DetailsBox,
        summary: SummaryEl,
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
            const quizJson = (props as Record<string, unknown>)['data-quiz'] as
                | string
                | undefined;

            if (embedType && embedUrl) {
                return <EmbedCard type={embedType} url={embedUrl} />;
            }

            if (quizJson) {
                return <MarkdownQuiz data-quiz={quizJson} />;
            }

            return <div {...props} />;
        },
        ...customMarkdownComponents,
        ...components,
    };

    return (
        <HeadingIdContext.Provider value={dispenseHeadingId}>
            <ReactMarkdown
                remarkPlugins={[
                    [remarkGfm, { singleTilde: false }],
                    remarkCodeMeta,
                    remarkDirective,
                    remarkFixUrlPorts,
                    remarkZennDirective,
                    remarkTabsDirective,
                    remarkCardDirective,
                    remarkStepsDirective,
                    remarkApiFieldsDirective,
                    remarkBadgeDirective,
                    remarkTooltipDirective,
                    remarkUpdateDirective,
                    remarkTreeDirective,
                    remarkQuizDirective,
                    remarkCodeGroupDirective,
                    [remarkWikilinks, resolveWikilinkFn],
                    remarkFallbackDirective,
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
                urlTransform={(url, key) =>
                    key === 'src' && url.startsWith('data:image/')
                        ? url
                        : defaultUrlTransform(url)
                }
            >
                {preprocessMarkdownContent(preprocessMarkdownSyntax(content))}
            </ReactMarkdown>
        </HeadingIdContext.Provider>
    );
}
