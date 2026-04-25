import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ApiFieldBaseProps {
    name?: string;
    type?: string;
    required?: string | boolean;
    deprecated?: string | boolean;
    defaultValue?: string;
    locationKind?: string;
    children?: ReactNode;
}

function resolveBoolean(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value !== '' && value !== 'false' && value !== '0';
    }

    return false;
}

function ApiFieldBase({
    name,
    type,
    required,
    deprecated,
    defaultValue,
    locationKind,
    children,
}: ApiFieldBaseProps) {
    const isRequired = resolveBoolean(required);
    const isDeprecated = resolveBoolean(deprecated);

    return (
        <div className="not-prose border-t border-border py-4 last:border-b">
            <div className="mb-2 flex flex-wrap items-center gap-2">
                {name && (
                    <span className="font-mono text-sm font-semibold text-sky-600 dark:text-sky-400">
                        {name}
                    </span>
                )}
                {locationKind && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {locationKind}
                    </span>
                )}
                {type && (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
                        {type}
                    </span>
                )}
                {isRequired && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        required
                    </span>
                )}
                {isDeprecated && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                        deprecated
                    </span>
                )}
                {defaultValue !== undefined && (
                    <span className="text-xs text-muted-foreground">
                        default:{' '}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono">
                            {defaultValue}
                        </code>
                    </span>
                )}
            </div>
            {children && (
                <div
                    className={cn(
                        'prose prose-sm text-muted-foreground dark:prose-invert',
                        '[&>p]:my-1 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0',
                    )}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

interface MarkdownResponseFieldProps {
    'data-field-name'?: string;
    'data-field-type'?: string;
    'data-field-required'?: string | boolean;
    'data-field-default'?: string;
    'data-field-deprecated'?: string | boolean;
    children?: ReactNode;
}

export function MarkdownResponseField({
    'data-field-name': name,
    'data-field-type': type,
    'data-field-required': required,
    'data-field-default': defaultValue,
    'data-field-deprecated': deprecated,
    children,
}: MarkdownResponseFieldProps) {
    return (
        <ApiFieldBase
            name={name}
            type={type}
            required={required}
            deprecated={deprecated}
            defaultValue={defaultValue}
        >
            {children}
        </ApiFieldBase>
    );
}

interface MarkdownParamFieldProps {
    'data-field-name'?: string;
    'data-field-type'?: string;
    'data-field-required'?: string | boolean;
    'data-field-default'?: string;
    'data-field-deprecated'?: string | boolean;
    'data-field-path'?: string;
    'data-field-query'?: string;
    'data-field-body'?: string;
    children?: ReactNode;
}

export function MarkdownParamField({
    'data-field-name': name,
    'data-field-type': type,
    'data-field-required': required,
    'data-field-default': defaultValue,
    'data-field-deprecated': deprecated,
    'data-field-path': path,
    'data-field-query': query,
    'data-field-body': body,
    children,
}: MarkdownParamFieldProps) {
    // path/query/body attribute value IS the parameter name; the key is the location
    const locationKind = path
        ? 'path'
        : query
          ? 'query'
          : body
            ? 'body'
            : undefined;
    const fieldName = name ?? path ?? query ?? body;

    return (
        <ApiFieldBase
            name={fieldName}
            type={type}
            required={required}
            deprecated={deprecated}
            defaultValue={defaultValue}
            locationKind={locationKind}
        >
            {children}
        </ApiFieldBase>
    );
}
