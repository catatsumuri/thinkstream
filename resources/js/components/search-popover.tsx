import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { search as searchRoute } from '@/routes';

type SearchNamespaceOption = {
    value: string;
    label: string;
    path: string;
};

type Props = {
    align?: 'left' | 'right';
    defaultNamespace?: string;
    trigger: React.ReactNode;
};

export default function SearchPopover({
    align = 'right',
    defaultNamespace = '',
    trigger,
}: Props) {
    const page = usePage();
    const searchNamespaces = (page.props.search?.namespaces ??
        []) as SearchNamespaceOption[];
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchNamespace, setSearchNamespace] = useState(defaultNamespace);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const panelId = useId();

    useEffect(() => {
        setSearchNamespace(defaultNamespace);
    }, [defaultNamespace]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        inputRef.current?.focus();
        inputRef.current?.select();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (
                event.target instanceof Element &&
                event.target.closest('[data-slot="select-content"]')
            ) {
                return;
            }

            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    function submitSearch(): void {
        const query = searchQuery.trim();

        router.visit(
            searchRoute({
                query: {
                    ...(query === '' ? {} : { q: query }),
                    ...(searchNamespace === ''
                        ? {}
                        : { namespace: searchNamespace }),
                },
            }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsOpen(false);
                },
            },
        );
    }

    return (
        <div ref={containerRef} className="relative">
            <div
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setIsOpen((current) => !current)}
            >
                {trigger}
            </div>
            {isOpen && (
                <div
                    id={panelId}
                    data-test="search-popover-panel"
                    className={`absolute top-full z-40 mt-3 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-sidebar-border/80 bg-background/95 p-3 shadow-lg backdrop-blur ${
                        align === 'left' ? 'left-0' : 'right-0'
                    }`}
                >
                    <form
                        role="search"
                        className="flex flex-col gap-3"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSearch();
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <Search className="size-4 shrink-0 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                type="search"
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                placeholder="Search guides pages"
                                autoComplete="off"
                                data-test="search-popover-input"
                                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                            />
                        </div>
                        <Select
                            value={searchNamespace || 'all'}
                            onValueChange={(value) =>
                                setSearchNamespace(value === 'all' ? '' : value)
                            }
                        >
                            <SelectTrigger
                                className="w-full"
                                data-test="search-popover-scope"
                            >
                                <SelectValue placeholder="Choose search target" />
                            </SelectTrigger>
                            <SelectContent align="start">
                                <SelectItem value="all">All</SelectItem>
                                {searchNamespaces.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <p>
                                Open a quick search window from the current
                                page.
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    data-test="search-popover-clear"
                                    onClick={() => {
                                        setSearchQuery('');
                                        inputRef.current?.focus();
                                    }}
                                >
                                    Clear
                                </Button>
                                <Button
                                    size="sm"
                                    type="submit"
                                    data-test="search-popover-submit"
                                >
                                    Search
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
