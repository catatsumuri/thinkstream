import { type ReactNode } from 'react';

interface MarkdownUpdateProps {
    'data-update-label'?: string;
    'data-update-description'?: string;
    'data-update-tags'?: string;
    children?: ReactNode;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export function MarkdownUpdate({
    'data-update-label': label,
    'data-update-description': description,
    'data-update-tags': tagsStr,
    children,
}: MarkdownUpdateProps) {
    const tags = tagsStr
        ? tagsStr
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
        : [];
    const anchorId = label ? slugify(label) : undefined;

    return (
        <div
            className="not-prose relative my-8 border-l-2 border-border py-1 pl-8 first:mt-0"
            data-test="markdown-update"
        >
            <div className="absolute top-[7px] -left-[5px] h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                {label ? (
                    <a
                        id={anchorId}
                        href={anchorId ? `#${anchorId}` : undefined}
                        className="scroll-mt-24 text-sm font-semibold text-foreground no-underline hover:text-primary"
                    >
                        {label}
                    </a>
                ) : null}
                {description ? (
                    <span className="text-sm text-muted-foreground">
                        {description}
                    </span>
                ) : null}
                {tags.map((tag) => (
                    <span
                        key={tag}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                        {tag}
                    </span>
                ))}
            </div>

            <div className="prose prose-sm dark:prose-invert [&>:first-child]:mt-0 [&>:last-child]:mb-0">
                {children}
            </div>
        </div>
    );
}
