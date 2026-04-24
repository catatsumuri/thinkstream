import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';

type TagInputProps = {
    tags: string[];
    onChange: (tags: string[]) => void;
    availableTags: string[];
};

export default function TagInput({
    tags,
    onChange,
    availableTags,
}: TagInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const suggestions = inputValue.trim()
        ? availableTags
              .filter(
                  (t) =>
                      t.startsWith(inputValue.toLowerCase().trim()) &&
                      !tags.includes(t),
              )
              .slice(0, 8)
        : [];

    function commitTag(raw: string) {
        const value = raw.toLowerCase().trim().replace(/,+$/, '');

        if (!value || tags.includes(value)) {
            setInputValue('');

            return;
        }

        onChange([...tags, value]);
        setInputValue('');
    }

    function removeTag(tag: string) {
        onChange(tags.filter((t) => t !== tag));
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitTag(inputValue);
        } else if (e.key === ',') {
            e.preventDefault();
            commitTag(inputValue);
        } else if (
            e.key === 'Backspace' &&
            inputValue === '' &&
            tags.length > 0
        ) {
            onChange(tags.slice(0, -1));
        }
    }

    return (
        <div className="relative">
            {tags.map((tag) => (
                <input key={tag} type="hidden" name="tags[]" value={tag} />
            ))}
            <div
                className="flex min-h-9 cursor-text flex-wrap gap-1.5 rounded-md border border-input bg-transparent px-3 py-2"
                onClick={() => inputRef.current?.focus()}
            >
                {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(tag);
                            }}
                            className="rounded-sm opacity-70 hover:opacity-100"
                            aria-label={`Remove ${tag}`}
                        >
                            <X className="size-3" />
                        </button>
                    </Badge>
                ))}
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 150)
                    }
                    placeholder={tags.length === 0 ? 'Add tags...' : ''}
                    className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
            </div>
            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                    {suggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                commitTag(suggestion);
                                setShowSuggestions(false);
                            }}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
