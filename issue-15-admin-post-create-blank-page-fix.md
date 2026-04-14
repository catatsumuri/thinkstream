# Issue #15 Fix Approach: Blank page on `/admin/posts/test/create`

## Problem

Clicking `Create your first post` from `/admin/posts/test` navigates to `/admin/posts/test/create`, but the page renders as a blank white screen.

The browser console shows:

```text
Error: Objects are not valid as a React child (found: object with keys {title, href})
An error occurred in the <breadcrumbs> component.
```

## Likely root cause

The create page defines breadcrumbs differently from the other admin post pages.

- `resources/js/pages/admin/posts/create.tsx` uses:

```tsx
Create.layout = {
    breadcrumbs: (props: { namespace: Namespace }) => [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Posts', href: index.url() },
        {
            title: props.namespace.name,
            href: namespaceRoute.url(props.namespace.slug),
        },
        { title: 'New Post', href: create.url(props.namespace.slug) },
    ],
};
```

- Sibling pages such as:
  - `resources/js/pages/admin/posts/namespace.tsx`
  - `resources/js/pages/admin/posts/show.tsx`
  - `resources/js/pages/admin/posts/edit.tsx`

  all call `setLayoutProps()` and pass `breadcrumbs` as a resolved array.

The app header and breadcrumb components expect `breadcrumbs` to be a `BreadcrumbItem[]`, not a callback nested inside a static layout props object. That mismatch likely causes invalid values to reach `resources/js/components/breadcrumbs.tsx`, which then crashes the page render.

## Recommended fix

Align `resources/js/pages/admin/posts/create.tsx` with the existing post pages and move breadcrumb setup into the component body with `setLayoutProps()`.

### Proposed change

1. Import `setLayoutProps` from `@inertiajs/react`.
2. Inside the `Create` component, call:

```tsx
setLayoutProps({
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Posts', href: index.url() },
        { title: namespace.name, href: namespaceRoute.url(namespace.slug) },
        { title: 'New Post', href: create.url(namespace.slug) },
    ],
});
```

3. Remove the current `Create.layout = { breadcrumbs: ... }` block.

## Why this approach

- It matches the established pattern already used by the other admin post pages.
- It keeps breadcrumb values concrete at render time instead of relying on mixed static/callback layout props.
- It is the smallest change that directly targets the blank-page failure.

## Files expected to change

- `resources/js/pages/admin/posts/create.tsx`

## Verification after the fix

1. Log in and open `/admin/posts/test`.
2. Click `Create your first post`.
3. Confirm `/admin/posts/test/create` renders the form instead of a blank page.
4. Confirm breadcrumbs render normally.
5. Confirm there is no console error from the breadcrumbs component.

## Optional hardening

If we want extra protection after fixing the root cause, we can also make `resources/js/components/breadcrumbs.tsx` fail more defensively when it receives an unexpected value. That said, the primary fix should be correcting the page-level layout props so the component receives the right type.
