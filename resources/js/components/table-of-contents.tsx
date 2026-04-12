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
                        className="block leading-snug font-medium text-foreground transition-colors hover:text-primary"
                    >
                        {post.title}
                    </a>
                    {post.headings.length > 0 && (
                        <ul className="ml-0.5 space-y-1 border-l border-border">
                            {post.headings.map((h) => (
                                <li
                                    key={h.id}
                                    style={{
                                        paddingLeft: `${(h.level - 1) * 12 + 8}px`,
                                    }}
                                >
                                    <a
                                        href={`#${h.id}`}
                                        className="block py-0.5 leading-snug text-muted-foreground transition-colors hover:text-foreground"
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
