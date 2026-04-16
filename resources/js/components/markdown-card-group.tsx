import {
    AlertCircle,
    ArrowRight,
    Award,
    Bell,
    Brain,
    Calendar,
    CheckCircle,
    ChevronDown,
    Clock,
    Code,
    Database,
    Download,
    ExternalLink,
    Eye,
    FileCode,
    Filter,
    Flag,
    Folder,
    Frame,
    GitBranch,
    HelpCircle,
    Info,
    LayoutGrid,
    Leaf,
    Link,
    ListOrdered,
    Lock,
    Mail,
    MessageCircle,
    MessageSquareWarning,
    Mouse,
    Palette,
    Rocket,
    Search,
    Settings,
    Smile,
    Sparkles,
    TextCursorInput,
    Timer,
    Upload,
    User,
    Users,
    XCircle,
    Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { sanitizeMarkdownCardHref } from '@/lib/markdown-card-href';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
    clock: Clock,
    timer: Timer,
    rocket: Rocket,
    mouse: Mouse,
    zap: Zap,
    lock: Lock,
    brain: Brain,
    sparkles: Sparkles,
    'arrow-right': ArrowRight,
    arrowright: ArrowRight,
    info: Info,
    'alert-circle': AlertCircle,
    alertcircle: AlertCircle,
    'check-circle': CheckCircle,
    checkcircle: CheckCircle,
    'x-circle': XCircle,
    xcircle: XCircle,
    'help-circle': HelpCircle,
    helpcircle: HelpCircle,
    code: Code,
    database: Database,
    'file-code': FileCode,
    filecode: FileCode,
    folder: Folder,
    frame: Frame,
    settings: Settings,
    user: User,
    users: Users,
    mail: Mail,
    bell: Bell,
    calendar: Calendar,
    search: Search,
    filter: Filter,
    eye: Eye,
    'layout-grid': LayoutGrid,
    layoutgrid: LayoutGrid,
    leaf: Leaf,
    'list-ordered': ListOrdered,
    listordered: ListOrdered,
    'chevron-down': ChevronDown,
    chevrondown: ChevronDown,
    download: Download,
    upload: Upload,
    'external-link': ExternalLink,
    externallink: ExternalLink,
    link: Link,
    'message-circle': MessageCircle,
    messagecircle: MessageCircle,
    'message-square-warning': MessageSquareWarning,
    messagesquarewarning: MessageSquareWarning,
    flag: Flag,
    award: Award,
    smile: Smile,
    'git-branch': GitBranch,
    gitbranch: GitBranch,
    'text-cursor-input': TextCursorInput,
    textcursorinput: TextCursorInput,
    palette: Palette,
};

function getLucideIcon(iconName: string | undefined): LucideIcon | undefined {
    if (!iconName) {
        return undefined;
    }

    return ICON_MAP[iconName.toLowerCase().trim()];
}

const GRID_COLS_CLASS: Record<number, string> = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
};

interface MarkdownCardGroupProps {
    'data-card-group-cols'?: string;
    children?: React.ReactNode;
}

export function MarkdownCardGroup({
    'data-card-group-cols': colsAttr,
    children,
}: MarkdownCardGroupProps) {
    const cols = Math.min(4, Math.max(1, parseInt(colsAttr ?? '2', 10) || 2));
    const gridColsClass = GRID_COLS_CLASS[cols] ?? 'md:grid-cols-2';

    return (
        <div
            className={`not-prose my-6 grid gap-4 ${gridColsClass}`}
            data-test="markdown-card-group"
        >
            {children}
        </div>
    );
}

interface MarkdownCardProps {
    'data-card-title'?: string;
    'data-card-icon'?: string;
    'data-card-href'?: string;
    children?: React.ReactNode;
}

export function MarkdownCard({
    'data-card-title': title,
    'data-card-icon': icon,
    'data-card-href': href,
    children,
}: MarkdownCardProps) {
    const iconNode = getLucideIcon(icon);
    const safeHref = sanitizeMarkdownCardHref(href);

    const cardContent = (
        <Card
            className={cn(
                'group h-full border transition-all hover:border-primary/50 hover:shadow-md',
                safeHref && 'cursor-pointer',
            )}
        >
            <CardHeader>
                <div className="flex items-start gap-3">
                    {iconNode ? (
                        <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                            <Icon
                                iconNode={iconNode}
                                className="h-5 w-5 text-primary"
                            />
                        </div>
                    ) : null}
                    <CardTitle className="text-base leading-tight">
                        {title ?? 'Untitled'}
                    </CardTitle>
                </div>
            </CardHeader>
            {children ? (
                <CardContent>
                    <div className="text-sm leading-relaxed text-muted-foreground">
                        {children}
                    </div>
                </CardContent>
            ) : null}
        </Card>
    );

    if (safeHref) {
        const isExternal = /^https?:\/\//.test(safeHref);

        if (isExternal) {
            return (
                <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block no-underline"
                >
                    {cardContent}
                </a>
            );
        }

        return (
            <a href={safeHref} className="block no-underline">
                {cardContent}
            </a>
        );
    }

    return cardContent;
}
