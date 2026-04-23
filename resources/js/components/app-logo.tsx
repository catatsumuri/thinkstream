import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <div className="flex size-10 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5 dark:bg-neutral-50">
                <AppLogoIcon
                    className="h-full w-full object-contain"
                    alt={`${name} logo`}
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {name}
                </span>
            </div>
        </>
    );
}
