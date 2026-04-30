# ThinkStream

ThinkStream is a Laravel + Inertia app for turning rough notes into structured, publishable markdown content.

It currently has two core surfaces:

- **Thinkstream**: a private canvas for collecting thoughts, refining titles, and using AI to structure notes
- **Posts**: a hierarchical publishing system built on namespaces, full-path routing, search, tags, revisions, sync, and backups

The current content flow is intentionally simple: **Thinkstream -> Posts**.  
Structured canvas output can be saved as a draft post in the `scrap` namespace, but posts do not keep a reverse link back to Thinkstream.

## Core ideas

- **Hierarchical content** with nested namespaces and stable `full_path` URLs
- **Docs-style publishing** with breadcrumbs, navigation trees, tags, and search
- **Markdown-first authoring** with custom rendering and local file sync
- **Safe publishing controls** for drafts, scheduled posts, and unpublished branches
- **Editorial tooling** including revisions, backups, restore flows, and AI-assisted editing

## Main features

### Thinkstream

- Create personal canvases and capture thoughts
- Edit, preview, and organize markdown notes
- Upload images inside thoughts
- Use AI to refine canvas titles and structure selected thoughts
- Back up and restore all canvases as ZIP archives
- Save structured output to Posts as a draft in `scrap`

### Posts

- Organize content in nested namespaces
- Publish posts via wildcard path resolution from `full_path`
- Control visibility with draft, scheduled, and namespace-level publish rules
- Search published content with Scout database search plus tag matching
- Browse posts by tag
- Track page views and HTTP referrers
- Keep revision history and restore older versions
- Sync existing posts with local `.md` files via `artisan sync:watch`
- Back up and restore namespace trees as ZIP archives

## Tech stack

- Laravel 13 / PHP 8
- Inertia.js v3 + React 19 + TypeScript
- Tailwind CSS v4
- SQLite
- Laravel Scout
- Laravel Fortify

## Development

If you are evaluating the project from GitHub, the shortest description is:

> **ThinkStream is a note-to-publishing workflow:** collect ideas in Thinkstream, turn them into markdown, and publish them through namespace-based posts.
