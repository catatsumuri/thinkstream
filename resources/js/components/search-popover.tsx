import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    defaultNamespace = '',
    trigger,
}: Props) {
    const page = usePage();
    const searchNamespaces = (page.props.search?.namespaces ??
        []) as SearchNamespaceOption[];
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchNamespace, setSearchNamespace] = useState(defaultNamespace);
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
        function handleKeyDown(event: KeyboardEvent) {
            const pressedShortcut =
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k';

            if (pressedShortcut) {
                event.preventDefault();
                setIsOpen(true);
            }

            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

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
        <>
            <div
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setIsOpen((current) => !current)}
            >
                {trigger}
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent
                    id={panelId}
                    data-test="search-popover-panel"
                    className="top-[18%] max-w-2xl translate-y-0 gap-0 overflow-hidden rounded-3xl border border-sidebar-border/80 bg-background p-0 shadow-2xl"
                >
                    <DialogHeader className="border-b border-sidebar-border/80 px-6 pt-6 pb-4">
                        <DialogTitle className="flex items-center gap-3 text-xl">
                            <Search className="size-5 text-muted-foreground" />
                            Search posts
                        </DialogTitle>
                        <DialogDescription>
                            Jump to any published page with{' '}
                            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                                Cmd/Ctrl
                            </kbd>
                            <span className="px-1 text-xs">+</span>
                            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">
                                K
                            </kbd>
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        role="search"
                        className="flex flex-col gap-4 p-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSearch();
                        }}
                    >
                        <div className="flex items-center gap-3 rounded-2xl border border-sidebar-border/80 bg-muted/30 px-4 py-3">
                            <Search className="size-4 shrink-0 text-muted-foreground" />
                            <Input
                                ref={inputRef}
                                type="search"
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                placeholder="Search published posts"
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
                                className="w-full bg-background"
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
                            <p>Search by title, path, and content excerpt.</p>
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
                </DialogContent>
            </Dialog>
        </>
    );
}
