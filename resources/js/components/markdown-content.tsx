import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessZennMarkdown } from '@/lib/zenn-markdown';

type MarkdownContentProps = {
    content: string;
    components?: Components;
};

export default function MarkdownContent({
    content,
    components,
}: MarkdownContentProps) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {preprocessZennMarkdown(content)}
        </ReactMarkdown>
    );
}
