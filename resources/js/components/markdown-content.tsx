import { AlertCircle, Info } from 'lucide-react';
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
import { remarkLinkifyToCard } from '@/lib/remark-linkify-to-card';
import { remarkMark } from '@/lib/remark-mark';
import { remarkZennDirective } from '@/lib/remark-zenn-directive';
import { cn } from '@/lib/utils';
import {
    preprocessZennMarkdown,
    preprocessZennSyntax,
} from '@/lib/zenn-markdown';

function MessageBox({
    children,
    className,
    ...props
}: React.ComponentPropsWithoutRef<'aside'>) {
    const isAlert = className?.includes('alert');

    if (!className?.includes('msg')) {
        return (
            <aside className={className} {...props}>
                {children}
            </aside>
        );
    }

    const Icon = isAlert ? AlertCircle : Info;

    return (
        <aside
            className={cn(
                'not-prose my-6 flex items-start gap-3 rounded-md px-4 py-4 text-sm leading-relaxed',
                isAlert
                    ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
                    : 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100',
            )}
            {...props}
        >
            <Icon
                className={cn(
                    'mt-0.5 shrink-0',
                    isAlert ? 'text-amber-500' : 'text-blue-500',
                )}
                size={18}
            />
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
    return (
        <ReactMarkdown
            remarkPlugins={[
                [remarkGfm, { singleTilde: false }],
                remarkDirective,
                remarkZennDirective,
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
            components={{
                aside: MessageBox,
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

                    return (
                        <dd className="ml-4 text-muted-foreground" {...props} />
                    );
                },
                div: (props: React.ComponentPropsWithoutRef<'div'>) => {
                    const embedType = (props as Record<string, unknown>)[
                        'data-embed-type'
                    ] as 'youtube' | 'card' | undefined;
                    const embedUrl = (props as Record<string, unknown>)[
                        'data-embed-url'
                    ] as string | undefined;

                    if (embedType && embedUrl) {
                        return <EmbedCard type={embedType} url={embedUrl} />;
                    }

                    return <div {...props} />;
                },
                ...components,
            }}
        >
            {preprocessZennMarkdown(preprocessZennSyntax(content))}
        </ReactMarkdown>
    );
}
