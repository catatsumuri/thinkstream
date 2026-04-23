import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            search: {
                namespaces: Array<{
                    value: string;
                    label: string;
                    path: string;
                }>;
            };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
