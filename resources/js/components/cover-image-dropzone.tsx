import { ImageMinus, ImagePlus, ImageUp, Pencil, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';

const COVER_IMAGE_ASPECT_RATIO = 16 / 9;
const CROP_STAGE_ASPECT_RATIO = 5 / 4;
const MAX_EXPORT_WIDTH = 1600;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const CROP_FRAME_WIDTH_PERCENT = 78;
const CROP_FRAME_HEIGHT_PERCENT =
    (CROP_FRAME_WIDTH_PERCENT * CROP_STAGE_ASPECT_RATIO) /
    COVER_IMAGE_ASPECT_RATIO;
const MOBILE_HEADER_ASPECT_RATIO = 390 / 192;
const DESKTOP_HEADER_ASPECT_RATIO = 1248 / 256;
const BACKGROUND_PRESETS = [
    { key: 'transparent', label: 'Transparent', color: null },
    { key: 'white', label: 'White', color: '#ffffff' },
    { key: 'black', label: 'Black', color: '#09090b' },
    { key: 'custom', label: 'Custom', color: null },
] as const;

type Props = {
    id?: string;
    name?: string;
    currentImageUrl?: string | null;
    onChange?: (file: File | null) => void;
    error?: string;
};

type CropDraft = {
    file: File;
    url: string;
    width: number;
    height: number;
};

type BackgroundPreset = (typeof BACKGROUND_PRESETS)[number]['key'];

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
    const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
    const [cropPosition, setCropPosition] = useState(50);
    const [zoom, setZoom] = useState(1);
    const [headerPreviewViewport, setHeaderPreviewViewport] = useState<
        'mobile' | 'desktop'
    >('desktop');
    const [showHeaderPreview, setShowHeaderPreview] = useState(false);
    const [backgroundPreset, setBackgroundPreset] =
        useState<BackgroundPreset>('transparent');
    const [customBackgroundColor, setCustomBackgroundColor] =
        useState('#f5f5f5');
    const dragCounterRef = useRef(0);
    const previewUrlRef = useRef<string | null>(null);
    const inputId = id ?? name;

    const displayImage = preview ?? currentImageUrl ?? null;
    const hasExistingImage = currentImageUrl !== null;
    const hasReplacementPreview = preview !== null;
    const sourceRatio = cropDraft ? cropDraft.width / cropDraft.height : null;
    const isLandscapeCrop =
        cropDraft !== null &&
        cropDraft.width / cropDraft.height > COVER_IMAGE_ASPECT_RATIO;
    const needsCropAdjustment =
        sourceRatio !== null &&
        Math.abs(sourceRatio - COVER_IMAGE_ASPECT_RATIO) > 0.01;

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        };
    }, []);

    useEffect(() => {
        return () => {
            if (cropDraft?.url) {
                URL.revokeObjectURL(cropDraft.url);
            }
        };
    }, [cropDraft]);

    function replacePreview(nextUrl: string | null) {
        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current);
        }

        previewUrlRef.current = nextUrl;
        setPreview(nextUrl);
    }

    function basePreviewSize() {
        if (!sourceRatio) {
            return { width: 100, height: 100 };
        }

        if (sourceRatio > COVER_IMAGE_ASPECT_RATIO) {
            return {
                width: 100,
                height: (COVER_IMAGE_ASPECT_RATIO / sourceRatio) * 100,
            };
        }

        if (sourceRatio < COVER_IMAGE_ASPECT_RATIO) {
            return {
                width: (sourceRatio / COVER_IMAGE_ASPECT_RATIO) * 100,
                height: 100,
            };
        }

        return { width: 100, height: 100 };
    }

    function framePreviewSize() {
        const previewSize = basePreviewSize();

        return {
            width: previewSize.width * zoom,
            height: previewSize.height * zoom,
        };
    }

    function headerImageFrame(containerAspectRatio: number): {
        width: number;
        height: number;
        left: number;
        top: number;
    } {
        if (containerAspectRatio > COVER_IMAGE_ASPECT_RATIO) {
            const height =
                (containerAspectRatio / COVER_IMAGE_ASPECT_RATIO) * 100;

            return {
                width: 100,
                height,
                left: 0,
                top: (100 - height) / 2,
            };
        }

        const width = (COVER_IMAGE_ASPECT_RATIO / containerAspectRatio) * 100;

        return {
            width,
            height: 100,
            left: (100 - width) / 2,
            top: 0,
        };
    }

    function resolvedBackgroundColor(): string | null {
        if (backgroundPreset === 'custom') {
            return customBackgroundColor;
        }

        return (
            BACKGROUND_PRESETS.find(
                (background) => background.key === backgroundPreset,
            )?.color ?? null
        );
    }

    function previewBackgroundStyle(): CSSProperties {
        const color = resolvedBackgroundColor();

        if (color) {
            return { backgroundColor: color };
        }

        return {
            backgroundColor: '#ffffff',
            backgroundImage:
                'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            backgroundSize: '20px 20px',
        };
    }

    async function readImageSize(file: File): Promise<{
        width: number;
        height: number;
    }> {
        const objectUrl = URL.createObjectURL(file);

        try {
            const image = await new Promise<HTMLImageElement>(
                (resolve, reject) => {
                    const nextImage = new Image();
                    nextImage.onload = () => resolve(nextImage);
                    nextImage.onerror = () =>
                        reject(new Error('Unable to load image.'));
                    nextImage.src = objectUrl;
                },
            );

            return {
                width: image.naturalWidth,
                height: image.naturalHeight,
            };
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    async function handleFile(file: File) {
        if (!file.type.startsWith('image/')) {
            return;
        }

        const { width, height } = await readImageSize(file);

        if (cropDraft?.url) {
            URL.revokeObjectURL(cropDraft.url);
        }

        setCropDraft({
            file,
            url: URL.createObjectURL(file),
            width,
            height,
        });
        setCropPosition(50);
        setZoom(1);
        setHeaderPreviewViewport('desktop');
        setShowHeaderPreview(false);
        setBackgroundPreset('transparent');
        setCustomBackgroundColor('#f5f5f5');
    }

    async function exportCroppedFile(): Promise<File | null> {
        if (!cropDraft) {
            return null;
        }

        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const nextImage = new Image();
            nextImage.onload = () => resolve(nextImage);
            nextImage.onerror = () =>
                reject(new Error('Unable to load image.'));
            nextImage.src = cropDraft.url;
        });

        const sourceWidth = image.naturalWidth;
        const sourceHeight = image.naturalHeight;
        const sourceRatio = sourceWidth / sourceHeight;
        const position = cropPosition / 100;
        const normalizedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        const exportWidth = MAX_EXPORT_WIDTH;
        const exportHeight = Math.round(exportWidth / COVER_IMAGE_ASPECT_RATIO);
        const canvas = document.createElement('canvas');
        canvas.width = exportWidth;
        canvas.height = exportHeight;

        const context = canvas.getContext('2d');

        if (!context) {
            return null;
        }

        const backgroundColor = resolvedBackgroundColor();

        if (backgroundColor) {
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, exportWidth, exportHeight);
        } else if (cropDraft.file.type === 'image/jpeg') {
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, exportWidth, exportHeight);
        }

        let drawWidth = exportWidth;
        let drawHeight = exportHeight;

        if (sourceRatio > COVER_IMAGE_ASPECT_RATIO) {
            drawWidth = exportWidth;
            drawHeight = exportWidth / sourceRatio;
        } else if (sourceRatio < COVER_IMAGE_ASPECT_RATIO) {
            drawWidth = exportHeight * sourceRatio;
            drawHeight = exportHeight;
        }

        drawWidth *= normalizedZoom;
        drawHeight *= normalizedZoom;

        let drawX = (exportWidth - drawWidth) / 2;
        let drawY = (exportHeight - drawHeight) / 2;

        if (sourceRatio > COVER_IMAGE_ASPECT_RATIO) {
            drawX = (exportWidth - drawWidth) * position;
        } else if (sourceRatio < COVER_IMAGE_ASPECT_RATIO) {
            drawY = (exportHeight - drawHeight) * position;
        }

        context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

        const mimeType = ['image/jpeg', 'image/png', 'image/webp'].includes(
            cropDraft.file.type,
        )
            ? cropDraft.file.type
            : 'image/png';
        const extension = mimeType.split('/')[1] ?? 'png';
        const fileName = cropDraft.file.name.replace(
            /\.[^.]+$/,
            `.${extension}`,
        );

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(
                resolve,
                mimeType,
                mimeType === 'image/png' ? undefined : 0.92,
            );
        });

        if (!blob) {
            return null;
        }

        return new File([blob], fileName, {
            type: mimeType,
            lastModified: Date.now(),
        });
    }

    async function applyCrop() {
        const croppedFile = await exportCroppedFile();

        if (!croppedFile) {
            return;
        }

        replacePreview(URL.createObjectURL(croppedFile));
        onChange?.(croppedFile);

        if (inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(croppedFile);
            inputRef.current.files = dt.files;
        }

        if (cropDraft?.url) {
            URL.revokeObjectURL(cropDraft.url);
        }

        setCropDraft(null);
        setZoom(1);
        setHeaderPreviewViewport('desktop');
        setShowHeaderPreview(false);
        setBackgroundPreset('transparent');
        setCustomBackgroundColor('#f5f5f5');
    }

    function cancelCrop() {
        if (cropDraft?.url) {
            URL.revokeObjectURL(cropDraft.url);
        }

        if (inputRef.current) {
            inputRef.current.value = '';
        }

        setCropDraft(null);
        setZoom(1);
        setHeaderPreviewViewport('desktop');
        setShowHeaderPreview(false);
        setBackgroundPreset('transparent');
        setCustomBackgroundColor('#f5f5f5');
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
            void handleFile(file);
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

    const previewSize = framePreviewSize();
    const previewWidth = previewSize.width;
    const previewHeight = previewSize.height;
    const previewLeft =
        sourceRatio && sourceRatio > COVER_IMAGE_ASPECT_RATIO
            ? (100 - previewWidth) * (cropPosition / 100)
            : (100 - previewWidth) / 2;
    const previewTop =
        sourceRatio && sourceRatio < COVER_IMAGE_ASPECT_RATIO
            ? (100 - previewHeight) * (cropPosition / 100)
            : (100 - previewHeight) / 2;
    const frameLeft = (100 - CROP_FRAME_WIDTH_PERCENT) / 2;
    const frameTop = (100 - CROP_FRAME_HEIGHT_PERCENT) / 2;
    const stagePreviewWidth = (previewWidth * CROP_FRAME_WIDTH_PERCENT) / 100;
    const stagePreviewHeight =
        (previewHeight * CROP_FRAME_HEIGHT_PERCENT) / 100;
    const stagePreviewLeft =
        frameLeft + (previewLeft * CROP_FRAME_WIDTH_PERCENT) / 100;
    const stagePreviewTop =
        frameTop + (previewTop * CROP_FRAME_HEIGHT_PERCENT) / 100;
    const mobileHeaderFrame = headerImageFrame(MOBILE_HEADER_ASPECT_RATIO);
    const desktopHeaderFrame = headerImageFrame(DESKTOP_HEADER_ASPECT_RATIO);
    const activeHeaderAspectRatio =
        headerPreviewViewport === 'mobile'
            ? MOBILE_HEADER_ASPECT_RATIO
            : DESKTOP_HEADER_ASPECT_RATIO;
    const activeHeaderFrame =
        headerPreviewViewport === 'mobile'
            ? mobileHeaderFrame
            : desktopHeaderFrame;
    const activeHeaderLabel =
        headerPreviewViewport === 'mobile' ? 'Mobile' : 'Desktop';
    const previewBackground = previewBackgroundStyle();

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
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/10" />
                        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
                            <div className="rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white">
                                {hasReplacementPreview
                                    ? 'Previewing new image'
                                    : hasExistingImage
                                      ? 'Existing image'
                                      : 'Selected image'}
                            </div>
                            <div className="rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-xs text-white/90">
                                Drag and drop to replace
                            </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-medium text-white">
                                <Pencil className="size-3" />
                                Click or drag and drop to replace
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
                                    ? 'Drop here to upload'
                                    : 'Drag an image here'}
                            </p>
                            {!isDragging && (
                                <p className="text-xs">
                                    Or{' '}
                                    <span className="underline underline-offset-2">
                                        click to choose
                                    </span>
                                </p>
                            )}
                        </div>
                        <p className="text-xs opacity-60">
                            JPEG, PNG, GIF, or WebP · Saved at 16:9 · Max 2 MB
                        </p>
                    </div>
                )}

                {isDragging && displayImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <div className="flex flex-col items-center gap-2 text-white">
                            <ImageUp className="size-8" />
                            <p className="text-sm font-medium">
                                Drop here to replace
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
                    {hasExistingImage ? 'Undo changes' : 'Clear selection'}
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
                        void handleFile(file);
                    }
                }}
                className="sr-only"
            />

            <InputError message={error} />

            <Dialog
                open={cropDraft !== null}
                onOpenChange={(open) => !open && cancelCrop()}
            >
                <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
                    <DialogHeader className="px-6 pt-6">
                        <DialogTitle>Adjust cover image</DialogTitle>
                        <DialogDescription>
                            The area inside the light frame is what will actually be used. Recommended size is at least 1600x900.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <div className="bg-black/55 px-6 py-5">
                            <div className="relative mx-auto aspect-[5/4] w-full max-w-3xl overflow-hidden rounded-xl border border-white/15 bg-neutral-950 shadow-2xl">
                                <div
                                    className="absolute"
                                    style={{
                                        ...previewBackground,
                                        left: `${frameLeft}%`,
                                        top: `${frameTop}%`,
                                        width: `${CROP_FRAME_WIDTH_PERCENT}%`,
                                        height: `${CROP_FRAME_HEIGHT_PERCENT}%`,
                                    }}
                                />
                                {cropDraft && (
                                    <img
                                        src={cropDraft.url}
                                        alt="Crop preview"
                                        className="absolute rounded-md select-none"
                                        style={{
                                            width: `${stagePreviewWidth}%`,
                                            height: `${stagePreviewHeight}%`,
                                            left: `${stagePreviewLeft}%`,
                                            top: `${stagePreviewTop}%`,
                                        }}
                                    />
                                )}
                                <div
                                    className="absolute inset-x-0 top-0 bg-black/48"
                                    style={{ height: `${frameTop}%` }}
                                />
                                <div
                                    className="absolute inset-x-0 bottom-0 bg-black/48"
                                    style={{ height: `${frameTop}%` }}
                                />
                                <div
                                    className="absolute left-0 bg-black/48"
                                    style={{
                                        top: `${frameTop}%`,
                                        width: `${frameLeft}%`,
                                        height: `${CROP_FRAME_HEIGHT_PERCENT}%`,
                                    }}
                                />
                                <div
                                    className="absolute right-0 bg-black/48"
                                    style={{
                                        top: `${frameTop}%`,
                                        width: `${frameLeft}%`,
                                        height: `${CROP_FRAME_HEIGHT_PERCENT}%`,
                                    }}
                                />
                                <div
                                    className="pointer-events-none absolute border border-white/85 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                                    style={{
                                        left: `${frameLeft}%`,
                                        top: `${frameTop}%`,
                                        width: `${CROP_FRAME_WIDTH_PERCENT}%`,
                                        height: `${CROP_FRAME_HEIGHT_PERCENT}%`,
                                    }}
                                >
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                        {Array.from({ length: 9 }).map(
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="border border-white/12"
                                                />
                                            ),
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t bg-background px-6 py-5">
                            <div className="mb-5 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs font-medium text-foreground">
                                        Live header preview
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setShowHeaderPreview(
                                                (current) => !current,
                                            )
                                        }
                                    >
                                        {showHeaderPreview
                                            ? 'Hide preview'
                                            : 'Show preview'}
                                    </Button>
                                </div>
                                {showHeaderPreview && (
                                    <div className="rounded-xl border bg-white p-3 shadow-xs">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="text-[11px] text-muted-foreground">
                                                <span>{activeHeaderLabel}</span>
                                                <span className="ml-2">
                                                    Public page appearance
                                                </span>
                                            </div>
                                            <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setHeaderPreviewViewport(
                                                            'mobile',
                                                        )
                                                    }
                                                    className={cn(
                                                        'rounded-md px-2.5 py-1 text-xs transition-colors',
                                                        headerPreviewViewport ===
                                                            'mobile'
                                                            ? 'bg-background text-foreground shadow-xs'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    Mobile
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setHeaderPreviewViewport(
                                                            'desktop',
                                                        )
                                                    }
                                                    className={cn(
                                                        'rounded-md px-2.5 py-1 text-xs transition-colors',
                                                        headerPreviewViewport ===
                                                            'desktop'
                                                            ? 'bg-background text-foreground shadow-xs'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    Desktop
                                                </button>
                                            </div>
                                        </div>
                                        <div
                                            className="relative w-full overflow-hidden rounded-md border"
                                            style={{
                                                ...previewBackground,
                                                aspectRatio: String(
                                                    activeHeaderAspectRatio,
                                                ),
                                            }}
                                        >
                                            {cropDraft && (
                                                <div
                                                    className="absolute overflow-hidden"
                                                    style={{
                                                        width: `${activeHeaderFrame.width}%`,
                                                        height: `${activeHeaderFrame.height}%`,
                                                        left: `${activeHeaderFrame.left}%`,
                                                        top: `${activeHeaderFrame.top}%`,
                                                    }}
                                                >
                                                    <img
                                                        src={cropDraft.url}
                                                        alt={`${activeHeaderLabel} header preview`}
                                                        className="absolute select-none"
                                                        style={{
                                                            width: `${previewWidth}%`,
                                                            height: `${previewHeight}%`,
                                                            left: `${previewLeft}%`,
                                                            top: `${previewTop}%`,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                            <p>
                                                This preview matches the header frame on the public page.
                                            </p>
                                            <p>
                                                It is meant to check the visible area, not the raw exported image.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                        <div className="mx-auto max-w-md">
                            <div className="mb-5 space-y-2">
                                <p className="text-center text-xs text-muted-foreground">
                                    Background color
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    {BACKGROUND_PRESETS.map((background) => (
                                        <button
                                            key={background.key}
                                            type="button"
                                            onClick={() =>
                                                setBackgroundPreset(
                                                    background.key,
                                                )
                                            }
                                            className={cn(
                                                'rounded-full border px-3 py-1.5 text-xs transition-colors',
                                                backgroundPreset ===
                                                    background.key
                                                    ? 'border-foreground bg-foreground text-background'
                                                    : 'border-input bg-background text-foreground',
                                            )}
                                        >
                                            {background.label}
                                        </button>
                                    ))}
                                </div>
                                {backgroundPreset === 'custom' && (
                                    <div className="flex items-center justify-center gap-3">
                                        <input
                                            type="color"
                                            value={customBackgroundColor}
                                            onChange={(e) =>
                                                setCustomBackgroundColor(
                                                    e.target.value,
                                                )
                                            }
                                            className="h-9 w-12 rounded border border-input bg-background p-1"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {customBackgroundColor}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <ImageUp className="size-4 text-muted-foreground" />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={cropPosition}
                                    onChange={(e) =>
                                        setCropPosition(Number(e.target.value))
                                    }
                                    className="w-full"
                                    disabled={!needsCropAdjustment}
                                />
                                <Pencil className="size-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-center text-xs text-muted-foreground">
                                {!needsCropAdjustment
                                    ? 'This image is already 16:9'
                                    : isLandscapeCrop
                                      ? 'Adjust horizontal position'
                                      : 'Adjust vertical position'}
                            </p>
                            <div className="mt-5 flex items-center gap-4">
                                <ImageMinus className="size-4 text-muted-foreground" />
                                <input
                                    type="range"
                                    min={MIN_ZOOM}
                                    max={MAX_ZOOM}
                                    step="0.05"
                                    value={zoom}
                                    onChange={(e) =>
                                        setZoom(Number(e.target.value))
                                    }
                                    className="w-full"
                                />
                                <ImagePlus className="size-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-center text-xs text-muted-foreground">
                                Zoom {zoom.toFixed(2)}x
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="border-t bg-muted/20 px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={cancelCrop}
                        >
                            Cancel
                        </Button>
                        <Button type="button" onClick={() => void applyCrop()}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
