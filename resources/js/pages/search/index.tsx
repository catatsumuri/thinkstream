import { Head, Link, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
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

type SearchResult = {
    id: number;
    page: string;
    path: string;
    href: string;
    excerpt: string;
};

export default function SearchIndex({
    query,
    namespace,
    results,
}: {
    query: string;
    namespace: string;
    results: SearchResult[];
}) {
    const page = usePage();
    const namespaceOptions = page.props.search?.namespaces ?? [];
    const [selectedNamespace, setSelectedNamespace] = useState(namespace);

    return (
        <>
            <Head title={query !== '' ? `Search: ${query}` : 'Search'} />

            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
                <div className="space-y-4">
                    <form
                        action={searchRoute.url()}
                        method="get"
                        className="flex flex-col gap-3"
                    >
                        {selectedNamespace !== '' && (
                            <input
                                type="hidden"
                                name="namespace"
                                value={selectedNamespace}
                            />
                        )}
                        <div className="flex flex-col gap-3 rounded-2xl border border-sidebar-border/80 bg-background p-3 shadow-sm sm:flex-row">
                            <div className="flex flex-1 items-center gap-3">
                                <Search className="size-4 text-muted-foreground" />
                                <Input
                                    type="search"
                                    name="q"
                                    defaultValue={query}
                                    placeholder="Search guides pages"
                                    data-test="search-page-input"
                                    className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                />
                            </div>
                            <Button
                                type="submit"
                                data-test="search-page-submit"
                            >
                                Search
                            </Button>
                        </div>
                        <Select
                            value={selectedNamespace || 'all'}
                            onValueChange={(value) =>
                                setSelectedNamespace(
                                    value === 'all' ? '' : value,
                                )
                            }
                        >
                            <SelectTrigger
                                className="w-full bg-background"
                                data-test="search-page-scope"
                            >
                                <SelectValue placeholder="Choose search target" />
                            </SelectTrigger>
                            <SelectContent align="start">
                                <SelectItem value="all">All</SelectItem>
                                {namespaceOptions.map(
                                    (option: {
                                        value: string;
                                        label: string;
                                    }) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </form>

                    <p className="text-sm text-muted-foreground">
                        Dummy results are currently picked from `/guides`.
                    </p>
                </div>

                {results.length > 0 ? (
                    <div className="space-y-3" data-test="search-results-list">
                        {results.map((result) => (
                            <Link
                                key={result.id}
                                href={result.href}
                                className="block rounded-2xl border border-sidebar-border/80 bg-card p-5 transition-colors hover:bg-accent/30"
                                data-test={`search-result-${result.id}`}
                            >
                                <div className="space-y-2">
                                    <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                        Page
                                    </p>
                                    <h2 className="text-lg font-semibold tracking-tight">
                                        {result.page}
                                    </h2>
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                    <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                        Path
                                    </p>
                                    <p className="break-all text-muted-foreground">
                                        {result.path}
                                    </p>
                                </div>
                                <div className="mt-4 space-y-2 text-sm">
                                    <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                        Content
                                    </p>
                                    <p className="leading-6 text-muted-foreground">
                                        {result.excerpt}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div
                        className="rounded-2xl border border-dashed border-sidebar-border/80 bg-muted/20 p-10 text-center text-sm text-muted-foreground"
                        data-test="search-empty-state"
                    >
                        No dummy guide results found.
                    </div>
                )}
            </div>
        </>
    );
}

SearchIndex.layout = {
    breadcrumbs: [
        {
            title: 'Search',
            href: searchRoute(),
        },
    ],
};
