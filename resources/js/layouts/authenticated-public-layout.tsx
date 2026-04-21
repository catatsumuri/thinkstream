import { usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

export default function AuthenticatedPublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { auth } = usePage<{
        auth: { user: { id: number; name: string } | null };
    }>().props;

    if (!auth.user) {
        return <>{children}</>;
    }

    return <AppLayout>{children}</AppLayout>;
}
