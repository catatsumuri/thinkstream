import {
    type ReactNode,
    Children,
    isValidElement,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MarkdownTabsProps {
    sync?: string | boolean;
    borderBottom?: string | boolean;
    children?: ReactNode;
}

interface MarkdownTabProps {
    title?: string;
    icon?: string;
    children?: ReactNode;
}

interface TabEntry {
    title: string;
    content: ReactNode;
    value: string;
}

type PreferredSelection = {
    title?: string;
};

const TABS_STORAGE_KEY = 'markdown-tabs-selection';
const TABS_CHANGE_EVENT = 'markdown-tabs:selection-change';

function getStoredSelection(): PreferredSelection | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(TABS_STORAGE_KEY);

        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as PreferredSelection;
    } catch {
        return null;
    }
}

function setStoredSelection(selection: PreferredSelection): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            TABS_STORAGE_KEY,
            JSON.stringify(selection),
        );
    } catch {
        // Ignore storage failures in restricted environments.
    }
}

function resolveBoolean(
    value: string | boolean | undefined,
    fallback: boolean,
): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value !== 'false' && value !== '0';
    }

    return fallback;
}

export function MarkdownTabs({
    sync = true,
    borderBottom = true,
    children,
    ...rest
}: MarkdownTabsProps & Record<string, unknown>) {
    const dataSync = rest['data-tabs-sync'] as string | boolean | undefined;
    const dataBorder = rest['data-tabs-border-bottom'] as
        | string
        | boolean
        | undefined;
    const isSyncEnabled = resolveBoolean(dataSync ?? sync, true);
    const showBorderBottom = resolveBoolean(dataBorder ?? borderBottom, true);
    const tabs = useMemo(() => extractTabs(children), [children]);
    const [preferredSelection, setPreferredSelection] =
        useState<PreferredSelection | null>(() =>
            isSyncEnabled ? getStoredSelection() : null,
        );
    const [selectedValue, setSelectedValue] = useState<string>('');

    useEffect(() => {
        if (tabs.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedValue('');

            return;
        }

        const currentTab = tabs.find((tab) => tab.value === selectedValue);

        if (
            currentTab &&
            preferredSelection &&
            currentTab.title === preferredSelection.title
        ) {
            return;
        }

        const matchedTab =
            preferredSelection?.title && isSyncEnabled
                ? tabs.find((tab) => tab.title === preferredSelection.title)
                : null;
        const nextValue = matchedTab?.value ?? tabs[0].value;

        if (nextValue !== selectedValue) {
            setSelectedValue(nextValue);
        }
    }, [isSyncEnabled, preferredSelection, selectedValue, tabs]);

    useEffect(() => {
        if (!isSyncEnabled || typeof window === 'undefined') {
            return undefined;
        }

        const handleSelectionChange = (event: Event) => {
            const customEvent = event as CustomEvent<PreferredSelection>;

            if (customEvent.detail?.title) {
                setPreferredSelection(customEvent.detail);
            }
        };

        window.addEventListener(
            TABS_CHANGE_EVENT,
            handleSelectionChange as EventListener,
        );

        return () => {
            window.removeEventListener(
                TABS_CHANGE_EVENT,
                handleSelectionChange as EventListener,
            );
        };
    }, [isSyncEnabled]);

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div className="not-prose my-6" data-test="markdown-tabs">
            <Tabs
                value={selectedValue}
                onValueChange={(value) => {
                    const selectedTab = tabs.find((tab) => tab.value === value);

                    if (!selectedTab) {
                        return;
                    }

                    setSelectedValue(selectedTab.value);

                    if (!isSyncEnabled) {
                        return;
                    }

                    const nextSelection = { title: selectedTab.title };
                    setPreferredSelection(nextSelection);
                    setStoredSelection(nextSelection);

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                            new CustomEvent(TABS_CHANGE_EVENT, {
                                detail: nextSelection,
                            }),
                        );
                    }
                }}
                className="w-full"
            >
                <TabsList
                    className={cn(
                        'h-auto w-full justify-start gap-2 rounded-2xl bg-muted/50 p-2',
                        showBorderBottom && 'border border-border/70',
                    )}
                >
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            data-test={`markdown-tab-trigger-${tab.title}`}
                            className="flex-none rounded-xl px-4 py-2 text-sm font-medium"
                        >
                            {tab.title}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tabs.map((tab) => (
                    <TabsContent
                        key={tab.value}
                        value={tab.value}
                        data-test={`markdown-tab-panel-${tab.title}`}
                        className="mt-4 rounded-2xl border border-border/70 bg-background/80 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                    >
                        {tab.content}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}

export function MarkdownTab({ children }: MarkdownTabProps) {
    return <>{children}</>;
}

function extractTabs(children: ReactNode): TabEntry[] {
    const nodes = Children.toArray(children);
    const tabs: TabEntry[] = [];

    nodes.forEach((child, index) => {
        if (!isValidElement(child)) {
            return;
        }

        const props = child.props as MarkdownTabProps & {
            'data-tab-title'?: string;
            title?: string;
        };
        const title =
            props.title ?? props['data-tab-title'] ?? `Tab ${index + 1}`;

        if (!props.title && !props['data-tab-title']) {
            return;
        }

        tabs.push({
            title,
            content: props.children,
            value: `${title}-${index}`,
        });
    });

    return tabs;
}
