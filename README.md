# thinkstream

ThinkStream is a Laravel + Inertia application for publishing structured knowledge from markdown content.

The current product axis is:

1. organize content in hierarchical namespaces
2. resolve public URLs from stable `full_path` values
3. publish or hide branches of content safely
4. support docs-style navigation, authoring, and import workflows

Markdown rendering matters here, but it is supporting infrastructure for the content and publishing model, not the product's main story.

## Search status

Search is currently in a provisional state.

- the public search UI exists
- `laravel/scout` is installed and configured with the built-in `database` engine
- `teamtnt/laravel-scout-tntsearch-driver` was evaluated but is not being adopted for now

Why TNTSearch is paused:

- as of 2026-04-23, the published Scout TNTSearch driver does not support Laravel 13 / Illuminate 13 in this app
- a possible upstream PR exists on the TNTSearch side, but that alone does not remove the Laravel 13 compatibility gap in the Scout driver
- the project is intentionally avoiding a temporary fork or patch-only dependency path for now

If search work resumes later, the preferred order is:

1. use Scout's database engine for simple search with minimal operational cost
2. revisit TNTSearch only if Laravel 13-compatible Scout support is released or maintained locally on purpose
3. move to Meilisearch only if the product needs typo tolerance and higher-end search UX badly enough to justify another service

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

## Sync mode

Sync mode lets you edit post content from a local `.md` file instead of the web UI. Changes are picked up automatically on each poll cycle.

### How it works

1. Open a post in the admin and click **Start Sync** on the show page. This writes the post's current content to `THINKSTREAM_SYNC_DIR/{full_path}.md` and enables sync mode. Web editing is disabled while sync mode is active.
2. Run the watcher:
   ```bash
   vendor/bin/sail artisan sync:watch
   ```
3. Edit the local `.md` file. The watcher polls for changes (default: every 1 second) and updates the post in the database.
4. To stop syncing, click **Remove sync file** on the show page, or delete the file from the sync directory. The next poll cycle disables sync mode for that post.

### Constraints

- **Existing posts only.** Files in the sync directory are matched to posts by `full_path`. If no matching post exists, the file is silently ignored. Sync does not create new posts or namespaces.
- **One file per post.** The mapping is `SYNC_DIR/{post.full_path}.md`.

### File format

```md
---
title: My Post
tags: [php, laravel]
---

Content goes here.
```

Only `title` and `tags` are read from the frontmatter. Everything after the closing `---` is treated as the post body.

### Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `THINKSTREAM_SYNC_DIR` | `storage/app/private/sync` | Directory the watcher reads from |
| `THINKSTREAM_SYNC_POLL_INTERVAL` | `1` | Poll interval in seconds |

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
| `app/Console/Commands/SyncWatchCommand.php` | Sync watcher Artisan command |
| `app/Services/SyncFileParser.php` | YAML frontmatter + Markdown parser for sync files |
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
