import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Code2, Eye } from 'lucide-react';
import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import type React from 'react';
import InputError from '@/components/input-error';
import MarkdownContent from '@/components/markdown-content';
import { Label } from '@/components/ui/label';
import { createMarkdownComponents } from '@/lib/markdown-components';
import { normalizeMarkdownHeadingText } from '@/lib/markdown-heading-text';
import { getMarkdownLinkPasteResult } from '@/lib/markdown-link-paste';
import { slugify } from '@/lib/slugify';
import { cn } from '@/lib/utils';

export type MarkdownEditorRef = {
    setContent: (content: string) => void;
    getContent: () => string;
    getSelection: () => { text: string; start: number; end: number } | null;
    replaceRange: (start: number, end: number, newText: string) => void;
};

type Props = {
    name: string;
    label?: string;
    defaultValue?: string;
    error?: string;
    uploadUrl?: string;
    jumpTo?: number;
    disabled?: boolean;
    onSelectionChange?: (hasSelection: boolean) => void;
    toolbar?: React.ReactNode;
};

const MarkdownEditor = forwardRef<MarkdownEditorRef, Props>(
    function MarkdownEditor(
        {
            name,
            label = 'Content',
            defaultValue = '',
            error,
            uploadUrl,
            jumpTo,
            disabled = false,
            onSelectionChange,
            toolbar,
        }: Props,
        ref,
    ) {
        const [value, setValue] = useState(defaultValue);
        const [activeTab, setActiveTab] = useState<'write' | 'preview'>(
            'write',
        );
        const valueRef = useRef(defaultValue);
        const lastSelectionRef = useRef<{
            text: string;
            start: number;
            end: number;
        } | null>(null);

        const updateValue = useCallback(
            (updater: React.SetStateAction<string>) => {
                const nextValue =
                    typeof updater === 'function'
                        ? (updater as (previous: string) => string)(
                              valueRef.current,
                          )
                        : updater;

                valueRef.current = nextValue;

                if (
                    textareaRef.current &&
                    textareaRef.current.value !== nextValue
                ) {
                    textareaRef.current.value = nextValue;
                }

                setValue(nextValue);
            },
            [],
        );

        useImperativeHandle(
            ref,
            () => ({
                setContent: (content: string) => updateValue(content),
                getContent: () => value,
                getSelection: () => lastSelectionRef.current,
                replaceRange: (start: number, end: number, newText: string) => {
                    lastSelectionRef.current = null;
                    onSelectionChange?.(false);
                    updateValue(
                        (prev) =>
                            prev.slice(0, start) + newText + prev.slice(end),
                    );
                },
            }),
            [onSelectionChange, updateValue, value],
        );
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const previewRef = useRef<HTMLDivElement>(null);
        const { props } = usePage<{ imageUrl?: string }>();
        const previousImageUrlRef = useRef<string | undefined>(undefined);
        const hasJumpedRef = useRef(false);

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

                updateValue((prevContent) => {
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
        }, [props.imageUrl, updateValue]);

        useEffect(() => {
            if (hasJumpedRef.current || jumpTo === undefined) {
                return;
            }

            const textarea = textareaRef.current;

            if (!textarea) {
                return;
            }

            const clamped = Math.max(
                0,
                Math.min(jumpTo, textarea.value.length),
            );
            const lineEnd = textarea.value.indexOf('\n', clamped);
            const selectionEnd =
                lineEnd === -1 ? textarea.value.length : lineEnd;
            textarea.focus();
            textarea.setSelectionRange(clamped, selectionEnd);

            // Mirror-div technique: measure actual pixel offset accounting for
            // wrapped lines (simple lineIndex * lineHeight is wrong for CJK text).
            const cs = window.getComputedStyle(textarea);
            const lineHeight = Number.parseFloat(cs.lineHeight) || 20;
            const mirror = document.createElement('div');
            mirror.style.cssText = [
                `font: ${cs.font}`,
                `line-height: ${cs.lineHeight}`,
                `padding: ${cs.padding}`,
                `width: ${String(textarea.clientWidth)}px`,
                `box-sizing: ${cs.boxSizing}`,
                'white-space: pre-wrap',
                'word-break: break-word',
                'overflow-wrap: break-word',
                'position: fixed',
                'visibility: hidden',
                'top: 0',
                'left: -200%',
                'height: auto',
            ].join('; ');
            mirror.textContent = textarea.value.slice(0, clamped);
            document.body.appendChild(mirror);
            const caretOffsetTop = mirror.scrollHeight;
            document.body.removeChild(mirror);
            textarea.scrollTo({
                top: Math.max(0, caretOffsetTop - lineHeight * 2),
            });

            const line = textarea.value.slice(clamped, selectionEnd);
            const headingMatch = /^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/.exec(line);

            if (headingMatch && previewRef.current) {
                const id = slugify(
                    normalizeMarkdownHeadingText(headingMatch[2]),
                );
                const el = previewRef.current.querySelector(
                    `#${CSS.escape(id)}`,
                );

                if (el) {
                    const containerTop =
                        previewRef.current.getBoundingClientRect().top;
                    const elTop = el.getBoundingClientRect().top;
                    previewRef.current.scrollTo({
                        top:
                            previewRef.current.scrollTop +
                            elTop -
                            containerTop -
                            16,
                    });
                }
            }

            hasJumpedRef.current = true;
        }, [jumpTo]);

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

        const syncLeftToRight = () => {
            const textarea = textareaRef.current;
            const preview = previewRef.current;

            if (!textarea || !preview) {
                return;
            }

            const scrollableHeight =
                textarea.scrollHeight - textarea.clientHeight;

            if (scrollableHeight <= 0) {
                return;
            }

            const ratio = textarea.scrollTop / scrollableHeight;
            preview.scrollTo({
                top: ratio * (preview.scrollHeight - preview.clientHeight),
            });
        };

        const syncRightToLeft = () => {
            const textarea = textareaRef.current;
            const preview = previewRef.current;

            if (!textarea || !preview) {
                return;
            }

            const scrollableHeight =
                preview.scrollHeight - preview.clientHeight;

            if (scrollableHeight <= 0) {
                return;
            }

            const ratio = preview.scrollTop / scrollableHeight;
            textarea.scrollTo({
                top: ratio * (textarea.scrollHeight - textarea.clientHeight),
            });
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

                return;
            }

            const pasteResult = getMarkdownLinkPasteResult({
                currentValue: e.currentTarget.value,
                pastedText: e.clipboardData.getData('text/plain'),
                selectionStart: e.currentTarget.selectionStart,
                selectionEnd: e.currentTarget.selectionEnd,
            });

            if (pasteResult) {
                e.preventDefault();
                updateValue(pasteResult.nextValue);

                setTimeout(() => {
                    if (textareaRef.current) {
                        textareaRef.current.setSelectionRange(
                            pasteResult.nextSelectionStart,
                            pasteResult.nextSelectionEnd,
                        );
                    }
                }, 0);

                lastSelectionRef.current = null;
                onSelectionChange?.(false);
            }
        };

        return (
            <div className="grid gap-2">
                {label && <Label htmlFor={name}>{label}</Label>}

                <div
                    data-test="markdown-editor"
                    className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                >
                    {/* Tab header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-2">
                        <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
                            <button
                                type="button"
                                data-test="markdown-editor-write-tab"
                                aria-pressed={activeTab === 'write'}
                                onClick={() => setActiveTab('write')}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                                    activeTab === 'write'
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Code2 className="size-3.5" />
                                <span className="hidden sm:inline">
                                    Markdown
                                </span>
                            </button>
                            <button
                                type="button"
                                data-test="markdown-editor-preview-tab"
                                aria-pressed={activeTab === 'preview'}
                                onClick={() => setActiveTab('preview')}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                                    activeTab === 'preview'
                                        ? 'bg-card text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Eye className="size-3.5" />
                                <span className="hidden sm:inline">
                                    Preview
                                </span>
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            {uploadUrl && (
                                <p className="hidden text-xs text-muted-foreground lg:block">
                                    Drag &amp; drop or paste images to upload
                                </p>
                            )}
                            {toolbar}
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2">
                        {/* Write column */}
                        <div
                            data-test="markdown-editor-write-panel"
                            className={cn(
                                'border-border lg:border-r',
                                activeTab !== 'write' && 'hidden lg:block',
                            )}
                        >
                            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Markdown
                                </p>
                                <button
                                    type="button"
                                    data-test="markdown-editor-sync-preview"
                                    onClick={syncLeftToRight}
                                    title="Sync preview to this position"
                                    className="hidden items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
                                >
                                    <ArrowRight className="size-3" />
                                    Scroll Sync
                                </button>
                            </div>
                            <textarea
                                ref={textareaRef}
                                id={name}
                                name={name}
                                defaultValue={defaultValue}
                                onChange={(e) => {
                                    valueRef.current = e.target.value;
                                    setValue(e.target.value);
                                }}
                                onSelect={(e) => {
                                    const t = e.currentTarget;
                                    const has =
                                        t.selectionStart !== t.selectionEnd;
                                    lastSelectionRef.current = has
                                        ? {
                                              text: t.value.slice(
                                                  t.selectionStart,
                                                  t.selectionEnd,
                                              ),
                                              start: t.selectionStart,
                                              end: t.selectionEnd,
                                          }
                                        : null;
                                    onSelectionChange?.(has);
                                }}
                                onMouseUp={(e) => {
                                    const t = e.currentTarget;
                                    const has =
                                        t.selectionStart !== t.selectionEnd;
                                    lastSelectionRef.current = has
                                        ? {
                                              text: t.value.slice(
                                                  t.selectionStart,
                                                  t.selectionEnd,
                                              ),
                                              start: t.selectionStart,
                                              end: t.selectionEnd,
                                          }
                                        : null;
                                    onSelectionChange?.(has);
                                }}
                                onKeyUp={(e) => {
                                    const t = e.currentTarget;
                                    const has =
                                        t.selectionStart !== t.selectionEnd;
                                    lastSelectionRef.current = has
                                        ? {
                                              text: t.value.slice(
                                                  t.selectionStart,
                                                  t.selectionEnd,
                                              ),
                                              start: t.selectionStart,
                                              end: t.selectionEnd,
                                          }
                                        : null;
                                    onSelectionChange?.(has);
                                }}
                                onDrop={uploadUrl ? handleDrop : undefined}
                                onDragOver={
                                    uploadUrl
                                        ? (e) => e.preventDefault()
                                        : undefined
                                }
                                onPaste={handlePaste}
                                readOnly={disabled}
                                placeholder="Write markdown here..."
                                className={cn(
                                    'h-[50vh] w-full resize-none border-0 bg-transparent px-4 pb-4 font-mono text-sm shadow-none outline-none placeholder:text-muted-foreground/60 lg:h-[65vh]',
                                    error && 'border-b border-destructive',
                                    disabled && 'cursor-not-allowed opacity-50',
                                )}
                            />
                        </div>

                        {/* Preview column */}
                        <div
                            data-test="markdown-editor-preview-panel"
                            className={cn(
                                'bg-muted/20',
                                activeTab !== 'preview' && 'hidden lg:block',
                            )}
                        >
                            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Preview
                                </p>
                                <button
                                    type="button"
                                    data-test="markdown-editor-sync-editor"
                                    onClick={syncRightToLeft}
                                    title="Sync editor to this position"
                                    className="hidden items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
                                >
                                    <ArrowLeft className="size-3" />
                                    Scroll Sync
                                </button>
                            </div>
                            <div
                                ref={previewRef}
                                className="h-[50vh] overflow-y-auto px-4 pb-4 text-sm lg:h-[65vh]"
                            >
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
                </div>

                <InputError message={error} />
            </div>
        );
    },
);

export default MarkdownEditor;
