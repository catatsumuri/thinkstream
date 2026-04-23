import { useSyncExternalStore } from 'react';

const DESKTOP_BREAKPOINT = 1024;

const mediaQuery =
    typeof window === 'undefined'
        ? undefined
        : window.matchMedia(`(max-width: ${DESKTOP_BREAKPOINT - 1}px)`);

function subscribe(callback: (event: MediaQueryListEvent) => void) {
    if (!mediaQuery) {
        return () => {};
    }

    mediaQuery.addEventListener('change', callback);

    return () => {
        mediaQuery.removeEventListener('change', callback);
    };
}

function getSnapshot(): boolean {
    return mediaQuery?.matches ?? false;
}

function getServerSnapshot(): boolean {
    return false;
}

export function useBelowDesktop(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
