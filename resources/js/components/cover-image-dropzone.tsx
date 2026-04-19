import { ImageUp, Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';

type Props = {
    id?: string;
    name?: string;
    currentImageUrl?: string | null;
    onChange?: (file: File | null) => void;
    error?: string;
};

export default function CoverImageDropzone({
    id,
    name,
    currentImageUrl,
    onChange,
    error,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const dragCounterRef = useRef(0);
    const previewUrlRef = useRef<string | null>(null);
    const inputId = id ?? name;

    const displayImage = preview ?? currentImageUrl ?? null;

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    function replacePreview(nextUrl: string | null) {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }

        previewUrlRef.current = nextUrl;
        setPreview(nextUrl);
    }

    function handleFile(file: File) {
        if (!file.type.startsWith('image/')) {
            return;
        }

        replacePreview(URL.createObjectURL(file));
        onChange?.(file);

        if (inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            inputRef.current.files = dt.files;
        }
    }

    function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        dragCounterRef.current++;
        setIsDragging(true);
    }

    function handleDragLeave() {
        dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);

        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    }

    function handleDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragging(false);
        const file = e.dataTransfer.files[0];

        if (file) {
            handleFile(file);
        }
    }

    function handleClear() {
        replacePreview(null);
        onChange?.(null);

        if (inputRef.current) {
            const dt = new DataTransfer();
            inputRef.current.files = dt.files;
        }
    }

    return (
        <div className="grid gap-2">
            <div
                onClick={() => inputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'group relative cursor-pointer overflow-hidden rounded-md border border-dashed transition-colors',
                    isDragging
                        ? 'border-ring bg-ring/8'
                        : 'border-input bg-muted/30 hover:border-ring/60 hover:bg-muted/50',
                )}
                style={
                    !displayImage
                        ? {
                              backgroundImage: isDragging
                                  ? 'radial-gradient(circle, color-mix(in oklch, var(--ring) 25%, transparent) 1.5px, transparent 1.5px)'
                                  : 'radial-gradient(circle, color-mix(in oklch, var(--muted-foreground) 20%, transparent) 1.5px, transparent 1.5px)',
                              backgroundSize: '18px 18px',
                          }
                        : undefined
                }
            >
                {displayImage ? (
                    <>
                        <img
                            src={displayImage}
                            alt="Cover preview"
                            className="h-40 w-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
                                <Pencil className="size-3" />
                                Replace image
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                        <div
                            className={cn(
                                'rounded-full border-2 border-dashed p-4 transition-colors',
                                isDragging
                                    ? 'border-ring text-ring'
                                    : 'border-muted-foreground/30',
                            )}
                        >
                            <ImageUp
                                className={cn(
                                    'size-8 transition-transform',
                                    isDragging && 'scale-110',
                                )}
                            />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-sm font-medium">
                                {isDragging
                                    ? 'Drop to upload'
                                    : 'Drop image here'}
                            </p>
                            {!isDragging && (
                                <p className="text-xs">
                                    or{' '}
                                    <span className="underline underline-offset-2">
                                        click to browse
                                    </span>
                                </p>
                            )}
                        </div>
                        <p className="text-xs opacity-60">
                            JPEG, PNG, GIF, or WebP · Max 2 MB
                        </p>
                    </div>
                )}

                {isDragging && displayImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="flex flex-col items-center gap-2 text-white">
                            <ImageUp className="size-8" />
                            <p className="text-sm font-medium">
                                Drop to replace
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {preview && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                    <X className="size-3" />
                    Clear selection
                </button>
            )}

            <input
                ref={inputRef}
                id={inputId}
                type="file"
                name={name}
                accept="image/*"
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) {
                        handleFile(file);
                    }
                }}
                className="sr-only"
            />

            <InputError message={error} />
        </div>
    );
}
