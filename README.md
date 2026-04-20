# thinkstream

ThinkStream is a Laravel + Inertia application for publishing structured knowledge from markdown content.

The current product axis is:

1. organize content in hierarchical namespaces
2. resolve public URLs from stable `full_path` values
3. publish or hide branches of content safely
4. support docs-style navigation, authoring, and import workflows

Markdown rendering matters here, but it is supporting infrastructure for the content and publishing model, not the product's main story.

## Core content model

ThinkStream currently revolves around two models:

| Model | Purpose | Important fields |
| --- | --- | --- |
| `PostNamespace` | Hierarchical container for content sections | `parent_id`, `slug`, `full_path`, `name`, `description`, `is_published`, `post_order` |
| `Post` | Individual published page inside a namespace | `namespace_id`, `slug`, `full_path`, `title`, `content`, `is_draft`, `published_at` |

### Namespace hierarchy

Namespaces are nested. Each namespace stores a `full_path`, and posts also store a `full_path`, so public content resolves by path instead of by flat slug pairs.

Example:

```text
guides
guides/laravel
guides/laravel/routing
guides/laravel/routing/wildcards
```

This path model is the center of the app's public information architecture.

### Publishing model

Public content is resolved through a wildcard route and rejected when it lives under an unpublished ancestor.

That means:

- unpublished namespaces are not just hidden from listings
- descendants under an unpublished branch are also blocked from direct URL access
- reserved root segments such as `admin`, `login`, `register`, and `api` are excluded from content routing

Relevant files:

- `routes/web.php`
- `app/Http/Controllers/PostController.php`
- `app/Support/ReservedContentPath.php`
- `app/Models/PostNamespace.php`
- `app/Models/Post.php`

## Public and admin flows

### Public side

The public UI is built with Inertia + React and currently provides:

- a root namespace index on `/`
- namespace pages resolved by `full_path`
- post pages resolved by `full_path`
- breadcrumb navigation
- a root-based content navigation tree for the active branch

The public controller assembles these views in `app/Http/Controllers/PostController.php`.

> **SSR requirement:** Post pages emit Twitter Card and Open Graph meta tags. These tags are rendered client-side via Inertia, so crawlers (Twitter, Slack, etc.) will not read them unless SSR is enabled. The app must run with `@inertiajs/vite` SSR in production for social sharing previews to work.

### Admin side

Authenticated users manage namespaces and posts under `/admin`.

Important details:

- admin namespace routing now binds namespaces by ID, not by slug
- namespace slugs are unique per parent, not globally unique
- posts remain scoped to their namespace for admin editing

Admin routes live in `routes/admin.php`.

## Markdown support

Markdown support exists to make authored content publishable inside this content model.

### Current pipeline

The markdown subsystem has three layers:

1. **Preprocessing** in `resources/js/lib/markdown-syntax.ts`
2. **Directive / AST transforms** in `resources/js/lib/remark-*.ts`
3. **React rendering** in `resources/js/components/markdown-*.tsx` and `resources/js/components/markdown-content.tsx`

### Frozen syntax surface

The supported extension surface is intentionally frozen in:

- `resources/js/lib/markdown-syntax-manifest.ts`

That manifest is the source of truth for:

- supported forwarded directive attributes
- supported Mintlify-style tags
- supported Zenn shorthand conversions
- supported custom markdown renderer components

If you expand the syntax surface, update the manifest and its regression tests explicitly instead of growing the pipeline implicitly.

### Supported syntax families

The current system supports a curated subset of Zenn-style and Mintlify-style authoring features, including:

- Zenn-style message and details shorthand
- image metadata rewriting and captions
- Tabs, cards, steps, API fields, code groups, badges, tooltips, updates, and tree blocks
- link-card and embed normalization

The regression entry point for this layer is:

- `tests-node/markdown/markdown-syntax.test.ts`

## Seeded content

Local development includes seeded example content under the `guides` namespace.

`database/seeders/PostSeeder.php` currently provides:

- baseline markdown examples
- syntax examples used during local verification
- sample content for the public publishing flow

This is convenient for development, but the seed data should be treated as demo content, not as the application's architectural center.

## Key files

| Path | Role |
| --- | --- |
| `app/Http/Controllers/PostController.php` | Public content resolution, breadcrumbs, and nav tree assembly |
| `app/Models/PostNamespace.php` | Hierarchical namespace model and ordering helpers |
| `app/Models/Post.php` | Post model for markdown pages |
| `routes/web.php` | Public routes, reserved path protection, wildcard resolver |
| `routes/admin.php` | Admin namespace and post management routes |
| `routes/console.php` | Import command definition |
| `resources/js/pages/posts/*.tsx` | Public Inertia pages |
| `resources/js/pages/admin/**/*.tsx` | Admin Inertia pages |
| `resources/js/lib/markdown-syntax-manifest.ts` | Markdown syntax freeze manifest |
| `resources/js/lib/markdown-syntax.ts` | Markdown preprocessing |

## Local development

This project runs in Laravel Sail.

### Initial setup

```bash
vendor/bin/sail up -d
vendor/bin/sail composer install
vendor/bin/sail npm install
cp .env.example .env
vendor/bin/sail artisan key:generate
vendor/bin/sail artisan migrate
vendor/bin/sail artisan db:seed --class=Database\\Seeders\\PostSeeder --no-interaction
vendor/bin/sail artisan wayfinder:generate --with-form --no-interaction
```

### Run the app

```bash
vendor/bin/sail npm run dev
```

### Useful commands

```bash
vendor/bin/sail artisan test --compact
vendor/bin/sail npm run markdown:test
vendor/bin/sail npm run types:check
vendor/bin/sail npm run build
```

## Direction

The current direction is to keep these concerns separated:

1. **content information architecture** - namespaces, paths, publication, navigation
2. **content ingestion** - importers and external docs intake
3. **markdown syntax platform** - rendering extensions that support authored content

When these move independently, review stays bounded and the product center stays clear.
