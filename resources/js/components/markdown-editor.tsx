import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import MarkdownContent from '@/components/markdown-content';
import { Label } from '@/components/ui/label';
import { createMarkdownComponents } from '@/lib/markdown-components';
import { cn } from '@/lib/utils';
import { router, usePage } from '@inertiajs/react';

type Props = {
    name: string;
    label?: string;
    defaultValue?: string;
    error?: string;
    uploadUrl?: string;
};

export default function MarkdownEditor({
    name,
    label = 'Content',
    defaultValue = '',
    error,
    uploadUrl,
}: Props) {
    const [value, setValue] = useState(defaultValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { props } = usePage<{ imageUrl?: string }>();
    const previousImageUrlRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (
            props.imageUrl &&
            props.imageUrl !== previousImageUrlRef.current &&
            textareaRef.current
        ) {
            previousImageUrlRef.current = props.imageUrl;

            const textarea = textareaRef.current;
            const { selectionStart, selectionEnd } = textarea;
            const markdown = `![image](${props.imageUrl})`;

            setValue((prevContent) => {
                const newContent =
                    prevContent.substring(0, selectionStart) +
                    markdown +
                    prevContent.substring(selectionEnd);

                setTimeout(() => {
                    const newPosition = selectionStart + markdown.length;
                    textarea.setSelectionRange(newPosition, newPosition);
                    textarea.focus();
                }, 0);

                return newContent;
            });
        }
    }, [props.imageUrl]);

    const handleImageUpload = (file: File) => {
        if (!uploadUrl || !file.type.startsWith('image/')) {
            return;
        }

        router.post(
            uploadUrl,
            { image: file },
            {
                preserveState: true,
                preserveScroll: true,
                onError: (errors) => {
                    alert(errors.image ?? 'Image upload failed.');
                },
            },
        );
    };

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        const imageFile = Array.from(e.dataTransfer.files).find((file) =>
            file.type.startsWith('image/'),
        );

        if (imageFile) {
            handleImageUpload(imageFile);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const imageItem = Array.from(e.clipboardData.items).find((item) =>
            item.type.startsWith('image/'),
        );

        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();

            if (file) {
                handleImageUpload(file);
            }
        }
    };

    return (
        <div className="grid gap-2">
            {label && <Label htmlFor={name}>{label}</Label>}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                    <p className="text-xs text-muted-foreground">Markdown</p>
                    <textarea
                        ref={textareaRef}
                        id={name}
                        name={name}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onDrop={uploadUrl ? handleDrop : undefined}
                        onDragOver={
                            uploadUrl ? (e) => e.preventDefault() : undefined
                        }
                        onPaste={uploadUrl ? handlePaste : undefined}
                        className={cn(
                            'h-[600px] w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none placeholder:text-muted-foreground',
                            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            error && 'border-destructive',
                        )}
                        placeholder="Write markdown here..."
                    />
                    {uploadUrl && (
                        <p className="text-xs text-muted-foreground">
                            Tip: Drag & drop or paste images to upload
                        </p>
                    )}
                </div>
                <div className="grid gap-1">
                    <p className="text-xs text-muted-foreground">Preview</p>
                    <div className="h-[600px] overflow-y-auto rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                        {value ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                                <MarkdownContent
                                    content={value}
                                    components={createMarkdownComponents()}
                                />
                            </div>
                        ) : (
                            <p className="text-muted-foreground">
                                Nothing to preview
                            </p>
                        )}
                    </div>
                </div>
            </div>
            <InputError message={error} />
        </div>
    );
}
