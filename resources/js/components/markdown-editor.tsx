import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    label?: string;
    defaultValue?: string;
    error?: string;
};

export default function MarkdownEditor({ name, label = 'Content', defaultValue = '', error }: Props) {
    const [value, setValue] = useState(defaultValue);

    return (
        <div className="grid gap-2">
            {label && <Label htmlFor={name}>{label}</Label>}
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1">
                    <p className="text-xs text-muted-foreground">Markdown</p>
                    <textarea
                        id={name}
                        name={name}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className={cn(
                            'border-input placeholder:text-muted-foreground h-[600px] w-full resize-y rounded-md border bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none',
                            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                            error && 'border-destructive',
                        )}
                        placeholder="Write markdown here..."
                    />
                </div>
                <div className="grid gap-1">
                    <p className="text-xs text-muted-foreground">Preview</p>
                    <div className="border-input h-[600px] overflow-y-auto rounded-md border bg-transparent px-3 py-2 text-sm">
                        {value ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">Nothing to preview</p>
                        )}
                    </div>
                </div>
            </div>
            <InputError message={error} />
        </div>
    );
}
