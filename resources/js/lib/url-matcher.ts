/**
 * URL matching utilities
 */

/** Returns true if the URL is a YouTube video URL. */
export function isYoutubeUrl(url: string): boolean {
    return [
        /^https?:\/\/youtu\.be\/[\w-]+(?:\?[\w=&-]+)?$/,
        /^https?:\/\/(?:www\.)?youtube\.com\/watch\?[\w=&-]+$/,
    ].some((pattern) => pattern.test(url));
}

const YOUTUBE_VIDEO_ID_LENGTH = 11;

/**
 * Extracts the video ID and optional start time (in seconds) from a YouTube URL.
 */
export function extractYoutubeVideoParameters(
    youtubeUrl: string,
): { videoId: string; start?: string } | undefined {
    if (!isYoutubeUrl(youtubeUrl)) {
        return undefined;
    }

    const url = new URL(youtubeUrl);
    const params = new URLSearchParams(url.search || '');

    const videoId = params.get('v') || url.pathname.split('/')[1];
    const start = params.get('t')?.replace('s', '');

    if (videoId?.length !== YOUTUBE_VIDEO_ID_LENGTH) {
        return undefined;
    }

    return { videoId, start };
}
