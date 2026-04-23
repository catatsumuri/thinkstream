import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocsSearchTrigger() {
    return (
        <Button
            variant="outline"
            size="sm"
            data-test="docs-search-trigger"
            className="h-8 gap-1.5 border-border/60 px-2.5 text-muted-foreground shadow-none hover:text-foreground"
        >
            <Search className="size-3.5" />
            <span className="hidden text-xs sm:inline">Search</span>
            <kbd
                data-test="docs-search-shortcut"
                className="pointer-events-none hidden h-5 items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground select-none sm:flex"
            >
                <span className="text-[10px]">⌘</span>K
            </kbd>
        </Button>
    );
}
