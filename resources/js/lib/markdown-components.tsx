import { Link as LinkIcon } from 'lucide-react';
import { Children, isValidElement } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { Components } from 'react-markdown';
import { CodeBlock } from '@/components/code-block';
import { MarkdownImage } from '@/components/markdown-image';
import { parseMarkdownImageMetadata } from '@/lib/markdown-syntax';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-');
}

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
): Pick<Components, 'h1' | 'h2' | 'h3'> {
    const makeTag = (level: 1 | 2 | 3) =>
        function Heading({ children }: { children?: ReactNode }) {
            const text =
                typeof children === 'string'
                    ? children
                    : String(children ?? '');
            const id = postSlug
                ? `${postSlug}-${slugify(text)}`
                : slugify(text);
            const Tag = `h${level}` as 'h1' | 'h2' | 'h3';

            return (
                <Tag id={id} className="group scroll-mt-6">
                    <span className="inline-flex items-center gap-2">
                        {children}
                        <a
                            href={`#${id}`}
                            onClick={() => copyAnchorUrl(id)}
                            aria-label={`Copy link to ${text}`}
                            title="Copy link to this section"
                            data-test={`heading-anchor-${id}`}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none"
                        >
                            <LinkIcon className="size-4" />
                        </a>
                    </span>
                </Tag>
            );
        };

    return {
        h1: makeTag(1),
        h2: makeTag(2),
        h3: makeTag(3),
    };
}

export function createMarkdownComponents(postSlug?: string): Components {
    return {
        ...makeHeadingComponents(postSlug),
        code: CodeBlock,
        img: MarkdownImage,
        p: MarkdownParagraph,
    };
}
