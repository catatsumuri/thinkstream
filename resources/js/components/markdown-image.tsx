import type { ComponentPropsWithoutRef } from 'react';
import { parseMarkdownImageMetadata } from '@/lib/markdown-syntax';
import { cn } from '@/lib/utils';

type MarkdownImageProps = ComponentPropsWithoutRef<'img'>;

export function MarkdownImage({
    alt,
    className,
    src,
    style,
    ...props
}: MarkdownImageProps) {
    const image = parseMarkdownImageMetadata(src);

    return (
        <img
            {...props}
            src={image.src}
            alt={alt}
            width={image.width}
            height={image.height}
            loading="lazy"
            className={cn('mx-auto my-6 block h-auto max-w-full', className)}
            style={{
                ...(image.width ? { width: `${image.width}px` } : {}),
                ...style,
            }}
        />
    );
}
