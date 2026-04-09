import type { Heading } from '@/hooks/use-markdown-toc';

type TocPost = {
    id: number;
    title: string;
    slug: string;
    headings: Heading[];
};

export default function TableOfContents({ posts }: { posts: TocPost[] }) {
    return (
        <nav className="sticky top-6 space-y-4 text-sm">
            <p className="font-semibold text-foreground">Contents</p>
            {posts.map((post) => (
                <div key={post.id} className="space-y-1">
                    <a
                        href={`#post-${post.slug}`}
                        className="font-medium text-foreground hover:text-primary transition-colors leading-snug block"
                    >
                        {post.title}
                    </a>
                    {post.headings.length > 0 && (
                        <ul className="space-y-1 border-l border-border ml-0.5">
                            {post.headings.map((h) => (
                                <li
                                    key={h.id}
                                    style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                                >
                                    <a
                                        href={`#${h.id}`}
                                        className="text-muted-foreground hover:text-foreground transition-colors block leading-snug py-0.5"
                                    >
                                        {h.text}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </nav>
    );
}
