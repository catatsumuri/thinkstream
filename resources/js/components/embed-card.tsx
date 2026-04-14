import { ExternalLink } from 'lucide-react';
import React from 'react';
import { extractYoutubeVideoParameters } from '@/lib/url-matcher';

interface EmbedCardProps {
    url: string;
    type: 'youtube' | 'card';
}

/**
 * Renders a YouTube video as an iframe embed.
 */
function YoutubeEmbed({ url }: { url: string }) {
    const params = extractYoutubeVideoParameters(url);

    if (!params?.videoId) {
        return <LinkCard url={url} />;
    }

    const time = Math.min(Number(params.start ?? 0), 48 * 60 * 60);
    const startQuery = time ? `?start=${time}` : '';

    return (
        <div
            className="not-prose my-4 flex justify-center"
            data-test="embed-card-youtube"
        >
            <div className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-black">
                <div className="relative" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${params.videoId}${startQuery}`}
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        className="absolute inset-0 size-full"
                        title="YouTube video"
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Fetches OGP metadata for a URL and renders a rich link card.
 * Falls back to a plain link when metadata is unavailable.
 */
function LinkCard({ url }: { url: string }) {
    const [metadata, setMetadata] = React.useState<{
        title?: string;
        description?: string;
        image?: string;
    } | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    const domain = (() => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    })();

    React.useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch(
                    `/api/ogp?url=${encodeURIComponent(url)}`,
                );

                if (response.ok) {
                    const data = await response.json();
                    setMetadata(data);
                } else {
                    setError(true);
                }
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        void fetchMetadata();
    }, [url]);

    if (loading) {
        return (
            <div
                className="not-prose my-4 overflow-hidden rounded-lg border border-border bg-card"
                data-test="embed-card-card"
            >
                <div className="flex items-start gap-3 p-4">
                    <ExternalLink className="mt-1 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !metadata) {
        return (
            <div
                className="not-prose my-4 overflow-hidden rounded-lg border border-border bg-card"
                data-test="embed-card-card"
            >
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 transition-colors hover:bg-muted"
                >
                    <ExternalLink className="mt-1 size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                            {url}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                            {domain}
                        </div>
                    </div>
                </a>
            </div>
        );
    }

    return (
        <div className="not-prose my-4" data-test="embed-card-card">
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:bg-muted"
            >
                {metadata.image && (
                    <div className="shrink-0">
                        <img
                            src={metadata.image}
                            alt=""
                            className="size-16 rounded object-cover"
                            loading="lazy"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-foreground">
                        {metadata.title || url}
                    </div>
                    {metadata.description && (
                        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {metadata.description}
                        </div>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground/70">
                        {domain}
                    </div>
                </div>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
            </a>
        </div>
    );
}

/**
 * Dispatches to the appropriate embed component based on URL type.
 */
export function EmbedCard({ url, type }: EmbedCardProps) {
    if (type === 'youtube') {
        return <YoutubeEmbed url={url} />;
    }

    return <LinkCard url={url} />;
}
