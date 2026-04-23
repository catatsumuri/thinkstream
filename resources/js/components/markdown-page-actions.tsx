import { Check, Copy, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';

type Props = {
    markdownUrl: string;
};

export default function MarkdownPageActions({ markdownUrl }: Props) {
    const [, copy] = useClipboard();
    const [copied, setCopied] = useState(false);
    const [copying, setCopying] = useState(false);

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timeoutId = window.setTimeout(() => setCopied(false), 2000);

        return () => window.clearTimeout(timeoutId);
    }, [copied]);

    const handleCopy = async () => {
        setCopying(true);

        try {
            const response = await fetch(markdownUrl, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'text/markdown',
                },
            });

            if (!response.ok) {
                return;
            }

            const content = await response.text();
            const didCopy = await copy(content);

            if (!didCopy) {
                return;
            }

            setCopied(true);
        } finally {
            setCopying(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
                <a
                    href={markdownUrl}
                    target="_blank"
                    rel="noreferrer"
                    data-test="view-as-markdown"
                >
                    <FileText className="size-4" />
                    View as Markdown
                </a>
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleCopy()}
                disabled={copying}
                data-test="copy-page-markdown"
            >
                {copied ? (
                    <Check className="size-4" />
                ) : (
                    <Copy className="size-4" />
                )}
                Copy Page
            </Button>
        </div>
    );
}
