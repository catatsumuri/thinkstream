# Content URL Unification Handoff

## Summary

This document captures the current status of the content URL unification work as of 2026-04-21.

The product direction is still:

- Treat `/{full_path}` as the canonical content URL.
- Keep `/admin/...` for management dashboards and operational tooling.
- Let authenticated users enter edit flows from canonical public pages.
- Return users to canonical public pages after editing.

That said, Phase 1 is now functionally in place on this branch. The current branch commit now covers canonical preview/edit affordances, canonical-aware create and save redirects, recursive namespace deletion, and the admin UI reshaping needed to make canonical pages the primary content surface.

## Current Evaluation

Overall status is good: the branch now delivers the intended Phase 1 journey well enough to treat the canonical content URL as the primary read/edit surface without changing the route model yet.

What is now in solid shape:

- canonical post pages expose direct edit entry and heading-level edit jumps
- canonical namespace pages expose inline section editing and in-context post creation
- admin create/save flows now recompute redirects from current model state instead of stale entry URLs
- namespace deletion now recursively deletes descendant namespaces and posts
- affected feature tests, type-checking, and production build are green on this branch

What still looks like follow-up rather than blocker work:

- the admin namespace post table still renders its external-link icon from `post.full_path` instead of the new `canonical_url` field, so the UI contract is not fully aligned yet
- admin detail screens still overlap with the new canonical authoring surface more than they should

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

### Committed on this branch

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
- `Manage` as the secondary admin/operations entry

Relevant file:

- [resources/js/pages/posts/show.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/show.tsx:125)

#### 3. Public namespace page edit entry

Authenticated users can now edit namespace metadata directly from the canonical namespace page.

Current public affordances:

- inline `Edit Section` / `Done` toggle
- `New Post`
- `Manage` as the secondary admin/operations entry

Relevant file:

- [resources/js/pages/posts/namespace.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/namespace.tsx:123)

#### 4. Admin create/edit redirects recompute canonical pages

Admin post and namespace edit pages now accept `return_to` for entry/cancel behavior, while save redirects recompute the latest canonical public URL from updated model state. Post creation also accepts `return_to`, so entering `New Post` from a canonical namespace page returns to the newly created canonical post page.

Relevant files:

- [app/Http/Controllers/Admin/PostController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/PostController.php:77)
- [app/Http/Controllers/Admin/NamespaceController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/NamespaceController.php:82)
- [resources/js/pages/admin/posts/create.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/create.tsx:36)
- [resources/js/pages/admin/posts/edit.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/edit.tsx:50)
- [resources/js/pages/admin/namespaces/edit.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/namespaces/edit.tsx:20)

#### 5. Public admin affordances have been reframed

Public pages now prefer:

- `Login`
- `Manage`
- content-specific edit controls

instead of treating `Admin` as the primary CTA.

#### 6. Slug prefix UI has been aligned in post create/edit

Admin post create and edit screens now consistently show the namespace path prefix in the slug field, including root namespaces.

Relevant files:

- [app/Http/Controllers/Admin/PostController.php](/opt/home-admin/thinkstream/app/Http/Controllers/Admin/PostController.php:72)
- [resources/js/pages/admin/posts/create.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/create.tsx:38)
- [resources/js/pages/admin/posts/edit.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/edit.tsx:34)

#### 7. Revision label cleanup

The accidental Japanese `変更履歴` label has been normalized back to `Revision History`.

Relevant files:

- [resources/js/pages/admin/posts/edit.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/edit.tsx:139)
- [resources/js/pages/admin/posts/revisions.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/revisions.tsx:116)

### Verified so far

The following were already run in Sail during this work:

```bash
vendor/bin/sail artisan test --compact tests/Feature/Auth/AuthenticationTest.php tests/Feature/PrivateModeTest.php
vendor/bin/sail artisan test --compact tests/Feature/Admin/PostControllerTest.php tests/Feature/Admin/NamespaceControllerTest.php
vendor/bin/sail artisan test --compact tests/Feature/PostControllerTest.php
vendor/bin/sail npm run types:check
vendor/bin/sail bin pint --dirty --format agent
vendor/bin/sail npm run build
```

Playwright also confirmed:

- `/guides -> Login -> authenticate -> /guides`
- `/guides/index -> Login -> authenticate -> /guides/index`
- authenticated canonical post page shows `Edit Page`
- authenticated canonical namespace page shows `Edit Section`

## Redirect Correctness Status

The stale-`return_to` save redirect problem has now been addressed.

Current behavior:

- `return_to` is still accepted as a signal that the user entered from a canonical page
- after `$post = Post::create(...)`, create redirects can use the post's new `full_path`
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
- namespace canonical: inline `Edit Section`, `New Post`

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

- materially done, with remaining cleanup/coverage work

Done:

1. canonical login return flow
2. canonical post edit entry
3. canonical namespace inline edit entry
4. canonical namespace `New Post` entry
5. `Manage` is now the public secondary admin utility label
6. admin create/edit redirects recompute canonical save destinations

Not done cleanly yet:

1. namespace canonical management affordances may still need product-level pruning
2. admin detail screens may still duplicate public detail screens more than necessary

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

Still not started, and should not be started until the remaining Phase 1 cleanup is explicitly considered complete.

## Next Work Recommendation

The next work should focus on the remaining UI contract gaps and product cleanup, not redirect correctness.

### Concrete next step

1. Align the admin namespace post table with the controller contract by only showing a public external-link target when `canonical_url` exists.
2. Reduce duplication between canonical detail pages and admin detail pages where it still exists.
3. Decide whether admin post show remains necessary as canonical pages become the primary authoring surface.

Suggested files:

- [resources/js/pages/posts/show.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/show.tsx:292)
- [resources/js/pages/posts/namespace.tsx](/opt/home-admin/thinkstream/resources/js/pages/posts/namespace.tsx:123)
- [resources/js/pages/admin/posts/namespace.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/namespace.tsx:199)
- [resources/js/pages/admin/posts/show.tsx](/opt/home-admin/thinkstream/resources/js/pages/admin/posts/show.tsx:1)
- [tests/Feature/PostControllerTest.php](/opt/home-admin/thinkstream/tests/Feature/PostControllerTest.php:90)

## Secondary Follow-Up After That

The next product decision should be made explicitly for canonical namespace pages:

- keep the current `Edit Section` + `New Post` surface
- or prune it back if it starts to feel too close to admin
- but do not turn canonical namespace pages into a full admin dashboard by default

## Test Plan Going Forward

Required additional coverage:

1. Updating a post with a changed slug redirects to the new canonical URL.
2. Updating a namespace with a changed slug redirects to the new canonical URL.
3. Public canonical pages receive the expected auth state for their edit/manage controls.
4. Any future namespace-level controls should add explicit auth/guest coverage when introduced.

Suggested commands:

```bash
vendor/bin/sail artisan test --compact tests/Feature/Admin/PostControllerTest.php tests/Feature/Admin/NamespaceControllerTest.php
vendor/bin/sail artisan test --compact tests/Feature/Auth/AuthenticationTest.php tests/Feature/PrivateModeTest.php
vendor/bin/sail artisan test --compact tests/Feature/PostControllerTest.php
vendor/bin/sail bin pint --dirty --format agent
vendor/bin/sail npm run build
```

## Risks and Constraints

### Risk 1: public pages becoming pseudo-admin dashboards

If too many management controls are added to canonical namespace pages, the public/admin separation will blur again.

### Risk 2: future path collisions

If Phase 3 introduces `/{path}/edit` or `/{path}/create`, reserved segment design must be handled deliberately.

Relevant files:

- [app/Support/ReservedContentPath.php](/opt/home-admin/thinkstream/app/Support/ReservedContentPath.php:1)
- [routes/web.php](/opt/home-admin/thinkstream/routes/web.php:28)

## Notes

- Laravel Boost MCP tools were expected by project instructions, but the MCP server was not available in this session, so analysis and implementation were done from repository code directly.
- The document was updated after commit `fb71e6c` on 2026-04-21.
