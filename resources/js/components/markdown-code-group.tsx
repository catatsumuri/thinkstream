import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { CodeBlock } from '@/components/code-block';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface TabInfo {
    lang: string;
    title: string;
    index: number;
    meta?: string | null;
    value?: string;
}

interface MarkdownCodeGroupProps {
    'data-codegroup-tabs'?: string;
    children?: ReactNode;
}

const CODE_GROUP_STORAGE_KEY = 'code';
const CODE_GROUP_CHANGE_EVENT = 'code-group:tab-change';

function getStoredTitle(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(CODE_GROUP_STORAGE_KEY);

        if (!raw) {
            return null;
        }

        return JSON.parse(raw) as string;
    } catch {
        return null;
    }
}

function setStoredTitle(title: string): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            CODE_GROUP_STORAGE_KEY,
            JSON.stringify(title),
        );
    } catch {
        // Ignore storage failures in restricted environments.
    }
}

function parseTabs(json: string | undefined): TabInfo[] {
    try {
        return json ? (JSON.parse(json) as TabInfo[]) : [];
    } catch {
        return [];
    }
}

export function MarkdownCodeGroup({
    'data-codegroup-tabs': tabsJson,
}: MarkdownCodeGroupProps) {
    const tabs = parseTabs(tabsJson);

    const [activeTitle, setActiveTitle] = useState<string>(() => {
        const stored = getStoredTitle();

        if (stored && tabs.some((t) => t.title === stored)) {
            return stored;
        }

        return tabs[0]?.title ?? '';
    });

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleChange = () => {
            const stored = getStoredTitle();

            if (stored && tabs.some((t) => t.title === stored)) {
                setActiveTitle(stored);
            }
        };

        window.addEventListener(CODE_GROUP_CHANGE_EVENT, handleChange);

        return () => {
            window.removeEventListener(CODE_GROUP_CHANGE_EVENT, handleChange);
        };
    }, [tabs]);

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div
            className="not-prose my-6 overflow-hidden rounded-lg border border-gray-700 bg-[#282c34]"
            data-test="code-group"
        >
            <Tabs
                value={activeTitle}
                onValueChange={(title) => {
                    setActiveTitle(title);
                    setStoredTitle(title);

                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event(CODE_GROUP_CHANGE_EVENT));
                    }
                }}
            >
                <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-gray-700 bg-gray-800 p-0">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.title}
                            value={tab.title}
                            data-test={`code-group-tab-${tab.title}`}
                            className={cn(
                                'rounded-none border-r border-gray-700 px-4 py-2.5 font-mono text-sm font-medium text-gray-400',
                                'hover:bg-gray-700 hover:text-gray-200',
                                'data-[state=active]:bg-[#282c34] data-[state=active]:text-gray-200 data-[state=active]:shadow-none',
                            )}
                        >
                            {tab.title}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tabs.map((tab) => (
                    <TabsContent
                        key={tab.title}
                        value={tab.title}
                        className="mt-0 [&_.not-prose]:my-0 [&_.not-prose]:rounded-none [&_.not-prose]:border-0"
                    >
                        <CodeBlock
                            className={
                                tab.lang
                                    ? `language-${tab.lang.toLowerCase()}`
                                    : undefined
                            }
                            metastring={tab.meta ?? undefined}
                        >
                            {tab.value ?? ''}
                        </CodeBlock>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
