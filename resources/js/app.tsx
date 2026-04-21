import { createInertiaApp, router } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import AuthenticatedPublicLayout from '@/layouts/authenticated-public-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('posts/'):
                return AuthenticatedPublicLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

function restoreHashTarget(): void {
    if (typeof window === 'undefined' || !window.location.hash) {
        return;
    }

    const id = decodeURIComponent(window.location.hash.slice(1));
    let attempts = 0;

    const scrollIntoView = () => {
        const element = document.getElementById(id);

        if (element) {
            element.scrollIntoView();

            return;
        }

        if (attempts >= 60) {
            return;
        }

        attempts += 1;
        requestAnimationFrame(scrollIntoView);
    };

    requestAnimationFrame(scrollIntoView);
}

if (typeof window !== 'undefined') {
    restoreHashTarget();
    router.on('navigate', restoreHashTarget);
}

// This will set light / dark mode on load...
initializeTheme();
