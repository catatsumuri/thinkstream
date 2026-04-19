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
                    'relative cursor-pointer overflow-hidden rounded-md border border-dashed transition-colors',
                    isDragging
                        ? 'border-ring bg-ring/5'
                        : 'border-input hover:border-ring/60',
                )}
            >
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt="Cover preview"
                        className="h-40 w-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-1 py-10 text-muted-foreground">
                        <p className="text-sm">
                            Drop image here or click to upload
                        </p>
                        <p className="text-xs">
                            JPEG, PNG, GIF, or WebP · Max 2 MB
                        </p>
                    </div>
                )}

                {isDragging && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                        <p className="text-sm font-medium text-ring">
                            Drop to upload
                        </p>
                    </div>
                )}
            </div>

            {preview && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="w-fit text-xs text-muted-foreground hover:text-destructive"
                >
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
