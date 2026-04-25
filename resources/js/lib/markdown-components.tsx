import { Link as LinkIcon, Pencil } from 'lucide-react';
import {
    Children,
    createContext,
    isValidElement,
    useContext,
    useRef,
    type ComponentPropsWithoutRef,
    type ReactNode,
} from 'react';
import { type Components } from 'react-markdown';
import { CodeBlock } from '@/components/code-block';
import { MarkdownImage } from '@/components/markdown-image';
import { extractRenderedHeadingText } from '@/lib/markdown-heading-text';
import { parseMarkdownImageMetadata } from '@/lib/markdown-syntax';
import { slugify } from '@/lib/slugify';
import { cn } from '@/lib/utils';

/**
 * Provides a function that dispenses deduplicated heading IDs.
 * Accepts a stable per-component identity object to avoid double-counting
 * in React Strict Mode's double-invoke.
 */
export const HeadingIdContext = createContext<
    ((baseId: string, self: object) => string) | null
>(null);

export type MarkdownComponentOptions = {
    headingAnchorPlacement?: 'inline' | 'gutter';
    onEditHeading?: (payload: {
        level: number;
        text: string;
        id: string;
    }) => void;
};

function copyAnchorUrl(id: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    const url = new URL(window.location.href);
    url.hash = id;

    window.history.replaceState(window.history.state, '', url);

    void navigator.clipboard?.writeText(url.toString());
}

function extractCaptionFromNode(node: ReactNode): string | undefined {
    if (!isValidElement<{ src?: string; children?: ReactNode }>(node)) {
        return undefined;
    }

    if (typeof node.props.src === 'string') {
        return parseMarkdownImageMetadata(node.props.src).caption;
    }

    const children = Children.toArray(node.props.children);

    if (children.length !== 1) {
        return undefined;
    }

    return extractCaptionFromNode(children[0]);
}

function MarkdownParagraph({
    children,
    ...props
}: ComponentPropsWithoutRef<'p'>) {
    const nodes = Children.toArray(children).filter((node) => {
        return typeof node !== 'string' || node.trim() !== '';
    });

    if (nodes.length !== 1) {
        return <p {...props}>{children}</p>;
    }

    const caption = extractCaptionFromNode(nodes[0]);

    if (!caption) {
        return <p {...props}>{children}</p>;
    }

    return (
        <figure className="my-6">
            {nodes[0]}
            <figcaption className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
                {caption}
            </figcaption>
        </figure>
    );
}

function makeHeadingComponents(
    postSlug?: string,
    {
        headingAnchorPlacement = 'inline',
        onEditHeading,
    }: MarkdownComponentOptions = {},
): Pick<Components, 'h1' | 'h2' | 'h3'> {
    const makeTag = (level: 1 | 2 | 3) =>
        function Heading({ children }: { children?: ReactNode }) {
            const dispenseId = useContext(HeadingIdContext);
            // Stable per-instance identity so Strict Mode's double-invoke
            // doesn't increment the shared counter twice for the same heading.
            const selfRef = useRef<object>({});
            const text = extractRenderedHeadingText(children);
            const baseId = postSlug
                ? `${postSlug}-${slugify(text)}`
                : slugify(text);
            const id = dispenseId
                ? dispenseId(baseId, selfRef.current)
                : baseId;
            const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

            return (
                <Tag
                    id={id}
                    className={cn(
                        'group scroll-mt-24',
                        headingAnchorPlacement === 'gutter' && 'relative',
                    )}
                >
                    {headingAnchorPlacement === 'gutter' && (
                        <a
                            href={`#${encodeURIComponent(id)}`}
                            onClick={() => copyAnchorUrl(id)}
                            aria-label={`Copy link to ${text}`}
                            title="Copy link to this section"
                            data-test={`heading-anchor-${id}`}
                            data-anchor-placement={headingAnchorPlacement}
                            className="absolute top-1/2 left-0 hidden -translate-x-[calc(100%+0.5rem)] -translate-y-1/2 rounded p-1 text-muted-foreground/60 opacity-0 transition-all group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none md:inline-flex"
                        >
                            <LinkIcon className="size-4" />
                        </a>
                    )}
                    {headingAnchorPlacement === 'inline' ? (
                        <span className="inline-flex items-center gap-2">
                            {children}
                            <a
                                href={`#${encodeURIComponent(id)}`}
                                onClick={() => copyAnchorUrl(id)}
                                aria-label={`Copy link to ${text}`}
                                title="Copy link to this section"
                                data-test={`heading-anchor-${id}`}
                                data-anchor-placement={headingAnchorPlacement}
                                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none"
                            >
                                <LinkIcon className="size-4" />
                            </a>
                        </span>
                    ) : onEditHeading && (level === 2 || level === 3) ? (
                        <span className="inline-flex items-center gap-1.5">
                            {children}
                            <button
                                type="button"
                                onClick={() =>
                                    onEditHeading({ level, text, id })
                                }
                                aria-label={`Edit section: ${text}`}
                                title="Edit this section"
                                className="rounded p-1 text-muted-foreground/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none"
                            >
                                <Pencil className="size-3.5" />
                            </button>
                        </span>
                    ) : (
                        children
                    )}
                </Tag>
            );
        };

    return {
        h1: makeTag(1),
        h2: makeTag(2),
        h3: makeTag(3),
    };
}

function MarkdownLink({
    href,
    children,
    ...props
}: ComponentPropsWithoutRef<'a'>) {
    const isExternal = href?.startsWith('http');

    return (
        <a
            href={href}
            className="underline underline-offset-2 hover:opacity-70"
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            {...props}
        >
            {children}
        </a>
    );
}

export function createMarkdownComponents(
    postSlug?: string,
    options: MarkdownComponentOptions = {},
): Components {
    return {
        ...makeHeadingComponents(postSlug, options),
        a: MarkdownLink,
        code: CodeBlock,
        img: MarkdownImage,
        p: MarkdownParagraph,
    };
}
