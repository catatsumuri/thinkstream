# Content URL Unification Handoff

## Summary

This document captures the current status of the content URL unification work as of 2026-04-20.

The product direction is still:

- Treat `/{full_path}` as the canonical content URL.
- Keep `/admin/...` for management dashboards and operational tooling.
- Let authenticated users enter edit flows from canonical public pages.
- Return users to canonical public pages after editing.

That said, Phase 1 is now materially in place. Save redirects now recompute the latest canonical URL from updated model state, while cancel flows can still use a carried `return_to` query value.

## Problem Statement

The application still has two URL systems for the same content:

- Public content:
  - `/guides`
  - `/guides/extended-syntax`
- Admin content:
  - `/admin/posts/1`
  - `/admin/posts/1/extended-syntax`
  - `/admin/posts/1/extended-syntax/edit`

The desired rule is:

- public canonical URLs are the primary read/edit surface
- `/admin/...` remains a dashboard and management surface

## Current Architecture

### Public Routing

Public content is resolved by wildcard path routing.

- [routes/web.php](/opt/home-admin/thinkstream/routes/web.php:28)
- [app/Http/Controllers/PostController.php](/opt/home-admin/thinkstream/app/Http/Controllers/PostController.php:51)

Behavior:

- `/{path}` resolves against `posts.full_path`
- if a post matches, render `resources/js/pages/posts/show.tsx`
- if a namespace matches, render `resources/js/pages/posts/namespace.tsx`

### Admin Routing

Admin content is resolved through explicit nested routes under `/admin/posts`.

- [routes/admin.php](/opt/home-admin/thinkstream/routes/admin.php:12)
- [app/Http/Controllers/Admin/PostController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/PostController.php:62)

Behavior:

- `/admin/posts` is the admin dashboard root
- `/admin/posts/{namespace}` is namespace management
- `/admin/posts/{namespace}/{post:slug}` is admin post detail
- `/admin/posts/{namespace}/{post:slug}/edit` is post edit

### Route Key Mismatch

The URL systems still differ because namespace route binding uses `id`, while public content lookup uses `full_path`.

- `PostNamespace` route key: [app/Models/PostNamespace.php](/opt/home-admin/thinkstream/app/Models/PostNamespace.php:52)
- `Post` route key: [app/Models/Post.php](/opt/home-admin/thinkstream/app/Models/Post.php:29)

Implication:

- public URL uses `full_path`
- admin URL uses `namespace id + post slug`

This mismatch is still the underlying reason that Phase 3 would be useful later.

## Current Status

### Implemented in the current worktree

#### 1. Canonical login return flow

Users who click `Login` from a canonical public page are sent to `/login?intended=...` and then returned to that canonical page after successful authentication.

Relevant files:

- [app/Providers/FortifyServiceProvider.php](/opt/home-admin/thinkstream/app/Providers/FortifyServiceProvider.php:48)
- [resources/js/pages/posts/index.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/index.tsx:31)
- [resources/js/pages/posts/namespace.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/namespace.tsx:123)
- [resources/js/pages/posts/show.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/show.tsx:292)

Tests added:

- [tests/Feature/Auth/AuthenticationTest.php](/opt/home-admin/thinkstream/tests/Feature/Auth/AuthenticationTest.php:36)

#### 2. Public post page edit entry

Authenticated users can now enter post editing directly from the canonical post page.

Current public affordances:

- `Edit Page`
- heading-level section editing from the canonical post page

Relevant file:

- [resources/js/pages/posts/show.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/show.tsx:125)

#### 3. Public namespace page edit entry

Authenticated users can now enter namespace editing directly from the canonical namespace page.

Current public affordances:

- `Edit Section`

Relevant file:

- [resources/js/pages/posts/namespace.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/namespace.tsx:123)

#### 4. Admin save redirects recompute canonical pages

Admin edit pages now accept `return_to` for entry/cancel behavior, while save redirects recompute the latest canonical public URL from updated model state.

Relevant files:

- [app/Http/Controllers/Admin/PostController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/PostController.php:111)
- [app/Http/Controllers/Admin/NamespaceController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/NamespaceController.php:82)
- [resources/js/pages/admin/posts/edit.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/edit.tsx:50)
- [resources/js/pages/admin/namespaces/edit.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/namespaces/edit.tsx:20)

#### 5. Admin has been de-emphasized in public headers

Public pages now prefer:

- `Login`
- `Dashboard`
- content-specific edit controls

instead of treating `Admin` as the primary CTA.

#### 6. Revision label cleanup

The accidental Japanese `変更履歴` label has been normalized back to `Revision History`.

Relevant files:

- [resources/js/pages/admin/posts/edit.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/edit.tsx:139)
- [resources/js/pages/admin/posts/revisions.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/revisions.tsx:116)

### Verified so far

The following were already run in Sail during this work:

```bash
vendor/bin/sail artisan test --compact tests/Feature/Auth/AuthenticationTest.php tests/Feature/PrivateModeTest.php
vendor/bin/sail artisan test --compact tests/Feature/Admin/PostControllerTest.php tests/Feature/Admin/NamespaceControllerTest.php
vendor/bin/sail bin pint --dirty --format agent
```

Playwright also confirmed:

- `/guides -> Login -> authenticate -> /guides`
- `/guides/index -> Login -> authenticate -> /guides/index`
- authenticated canonical post page shows `Edit Page`

## Redirect Correctness Status

The stale-`return_to` save redirect problem has now been addressed.

Current behavior:

- `return_to` is still accepted as a signal that the user entered from a canonical page
- after `$post->update($data)`, save redirects use the post's updated `full_path`
- after `$namespace->update($data)`, save redirects use the namespace's updated `full_path`
- `return_heading` is preserved only as a fragment/hash

## Recommended Product Interpretation

The current thinking is:

- canonical URLs should be for view/edit
- `/admin` should be for management/operations

That means:

### Canonical pages should contain

- view content
- edit the current item
- optionally lightweight in-context actions directly related to the current item

Examples:

- post canonical: `Edit Page`, `Edit Section`
- namespace canonical: `Edit Section`
- maybe `New Post` later if it feels natural in-context

### `/admin` should contain

- namespace tree management
- cross-namespace dashboards
- sorting/reordering
- list views
- revision tooling
- broader operational workflows

This means we should avoid turning canonical namespace pages into a full admin control plane.

## Recommended Phase Framing

### Phase 1

Goal:

- unify the editor journey without changing route models

Status:

- partially done

Done:

1. canonical login return flow
2. canonical post edit entry
3. canonical namespace edit entry
4. `Dashboard` is now more clearly secondary/admin utility

Not done cleanly yet:

1. namespace canonical management affordances still need product-level pruning/expansion
2. public-page auth-state coverage is still thinner than ideal

### Phase 2

Goal:

- reduce duplicate UI responsibilities between public detail pages and admin detail pages

Still not started.

Questions still valid:

1. Is admin post show still necessary once public pages are the primary editing entry point?
2. Which display blocks should be shared between public and admin views?
3. Can admin detail responsibilities be reduced further?

### Phase 3

Goal:

- move to path-based edit URLs

Examples:

- `/guides/edit`
- `/guides/extended-syntax/edit`

Still not started, and should not be started until Phase 1 redirect behavior is cleaned up.

## Next Commit Recommendation

The next commit should focus on the remaining product and coverage gaps, not redirect correctness.

### Concrete next step

1. Decide whether canonical namespace pages should keep only `Edit Section` or also expose `New Post`.
2. Add broader auth-state coverage for canonical namespace/post page controls.
3. Reduce duplication between canonical detail pages and admin detail pages where it still exists.

Suggested files:

- [app/Http/Controllers/Admin/PostController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/PostController.php:111)
- [app/Http/Controllers/Admin/NamespaceController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/NamespaceController.php:82)
- [tests/Feature/Admin/PostControllerTest.php](/opt/home-admin/thinkstream/tests/Feature/Admin/PostControllerTest.php:370)
- [tests/Feature/Admin/NamespaceControllerTest.php](/opt/home-admin/thinkstream/tests/Feature/Admin/NamespaceControllerTest.php:249)

## Secondary Follow-Up After That

Once redirect correctness is fixed, the next product decision should be made explicitly for canonical namespace pages:

- keep only `Edit Section`
- or add `New Post`
- but do not turn canonical namespace pages into a full admin dashboard by default

That decision should be made before adding more namespace-level controls.

## Test Plan Going Forward

Required additional coverage:

1. Updating a post with a changed slug redirects to the new canonical URL.
2. Updating a namespace with a changed slug redirects to the new canonical URL.
3. Public namespace page shows authenticated edit affordances.
4. Public namespace page hides those affordances from guests.

Suggested commands:

```bash
vendor/bin/sail artisan test --compact tests/Feature/Admin/PostControllerTest.php tests/Feature/Admin/NamespaceControllerTest.php
vendor/bin/sail artisan test --compact tests/Feature/Auth/AuthenticationTest.php tests/Feature/PrivateModeTest.php
vendor/bin/sail bin pint --dirty --format agent
```

## Risks and Constraints

### Risk 1: stale carried paths

If save redirects continue to trust a carried `return_to`, users may land on outdated URLs after slug changes.

### Risk 2: public pages becoming pseudo-admin dashboards

If too many management controls are added to canonical namespace pages, the public/admin separation will blur again.

### Risk 3: future path collisions

If Phase 3 introduces `/{path}/edit` or `/{path}/create`, reserved segment design must be handled deliberately.

Relevant files:

- [app/Support/ReservedContentPath.php](/opt/home-admin/thinkstream/app/Support/ReservedContentPath.php:1)
- [routes/web.php](/opt/home-admin/thinkstream/routes/web.php:28)

## Notes

- Laravel Boost MCP tools were expected by project instructions, but the MCP server was not available in this session, so analysis and implementation were done from repository code directly.
- The document was updated after partial Phase 1 implementation in the working tree on 2026-04-20.
