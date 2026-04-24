<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RestorePostRevisionRequest;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Http\Requests\Admin\UploadPostImageRequest;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostRevision;
use App\Support\NamespaceBackupArchive;
use App\Support\NamespaceRestoreArchive;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PostController extends Controller
{
    public function index(Request $request, NamespaceRestoreArchive $restoreArchive): Response
    {
        $allowedColumns = ['name', 'posts_count', 'is_published'];
        $allowedDirections = ['asc', 'desc'];

        if ($request->hasAny(['sort', 'dir'])) {
            $column = in_array($request->input('sort'), $allowedColumns) ? $request->input('sort') : 'name';
            $direction = in_array($request->input('dir'), $allowedDirections) ? $request->input('dir') : 'asc';

            $namespaces = PostNamespace::withCount('posts')
                ->with($this->childrenRelation())
                ->whereNull('parent_id')
                ->orderBy($column, $direction)
                ->get();
        } else {
            $column = 'sort_order';
            $direction = 'asc';

            $namespaces = PostNamespace::withCount('posts')
                ->with($this->childrenRelation())
                ->whereNull('parent_id')
                ->orderByRaw('sort_order IS NULL, sort_order ASC, name ASC')
                ->get();
        }

        $restoreToken = $request->string('restore')->toString();
        $restorePreview = null;

        if ($restoreToken !== '' && $restoreArchive->hasToken($restoreToken)) {
            $restorePreview = [
                'token' => $restoreToken,
                ...$restoreArchive->preview($restoreArchive->tokenPath($restoreToken)),
                'stream_url' => route('admin.posts.restore.stream', ['token' => $restoreToken], absolute: false),
            ];
        }

        return Inertia::render('admin/posts/index', [
            'namespaces' => $namespaces,
            'sort' => ['column' => $column, 'direction' => $direction],
            'restore_upload_url' => route('admin.posts.restore.upload', absolute: false),
            'restore_preview' => $restorePreview,
        ]);
    }

    /** @return array<string, \Closure> */
    private function childrenRelation(): array
    {
        $order = 'sort_order IS NULL, sort_order ASC, name ASC';

        return [
            'children' => fn ($q) => $q->withCount('posts')->orderByRaw($order)
                ->with(['children' => fn ($q2) => $q2->withCount('posts')->orderByRaw($order)]),
        ];
    }

    public function namespaceIndex(PostNamespace $namespace): Response
    {
        $posts = $namespace->sortPosts($namespace->posts()->latest()->get([
            'id',
            'title',
            'slug',
            'full_path',
            'is_draft',
            'published_at',
            'created_at',
        ]))->map(fn (Post $post) => [
            'id' => $post->id,
            'title' => $post->title,
            'slug' => $post->slug,
            'full_path' => $post->full_path,
            'is_draft' => $post->is_draft,
            'published_at' => $post->published_at,
            'created_at' => $post->created_at,
            'canonical_url' => ! $post->is_draft && $post->published_at !== null && $post->published_at->isPast()
                ? route('posts.path', ['path' => $post->full_path], absolute: false)
                : null,
            'admin_url' => route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug], absolute: false),
        ]);

        $backupCount = $this->backupCount($namespace);

        $namespace->setAttribute('backup_count', $backupCount);
        $namespace->setAttribute(
            'backup_management_url',
            route('admin.posts.backups', ['namespace' => $namespace], absolute: false)
        );

        return Inertia::render('admin/posts/namespace', [
            'namespace' => $namespace,
            'ancestors' => $namespace->ancestors()->map(fn (PostNamespace $ns) => ['id' => $ns->id, 'name' => $ns->name]),
            'children' => $namespace->sortNamespaces($namespace->children()->withCount('posts')->get()),
            'delete_posts_url' => route('admin.posts.destroyMany', $namespace, absolute: false),
            'posts' => $posts,
        ]);
    }

    public function backups(PostNamespace $namespace): Response
    {
        return Inertia::render('admin/posts/backups', [
            'namespace' => [
                'id' => $namespace->id,
                'name' => $namespace->name,
                'slug' => $namespace->slug,
                'full_path' => $namespace->full_path,
                'backup_count' => $this->backupCount($namespace),
            ],
            'create_backup_url' => route('admin.posts.backups.store', $namespace, absolute: false),
            'delete_backups_url' => route('admin.posts.backups.destroyMany', $namespace, absolute: false),
            'backups' => collect($this->backupsForNamespace($namespace))
                ->map(fn (array $backup): array => collect($backup)->except('path')->all())
                ->all(),
        ]);
    }

    public function storeBackup(PostNamespace $namespace): RedirectResponse
    {
        $exitCode = Artisan::call('namespace:backup', [
            'namespace' => $namespace->id,
        ]);

        if ($exitCode !== 0) {
            return back()->withErrors([
                'backup' => 'Failed to create a new backup.',
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Backup created.']);

        return to_route('admin.posts.backups', $namespace);
    }

    public function destroyManyBackups(Request $request, PostNamespace $namespace): RedirectResponse
    {
        $availableFilenames = collect($this->backupsForNamespace($namespace))
            ->pluck('filename')
            ->all();

        $data = $request->validate([
            'filenames' => ['required', 'array', 'min:1'],
            'filenames.*' => ['string', 'distinct:strict', Rule::in($availableFilenames)],
        ]);

        foreach ($data['filenames'] as $filename) {
            $backupRecord = $this->backupRecordFor($namespace, $filename);

            if ($backupRecord !== null && File::exists($backupRecord['path'])) {
                File::delete($backupRecord['path']);
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Selected backups deleted.']);

        return to_route('admin.posts.backups', $namespace);
    }

    public function restoreBackup(Request $request, PostNamespace $namespace, string $backup): RedirectResponse
    {
        $request->validate([
            'confirmation' => ['required', 'string', Rule::in([$namespace->name])],
        ]);

        $backupRecord = $this->backupRecordFor($namespace, $backup);

        abort_unless($backupRecord !== null, 404);

        $exitCode = Artisan::call('namespace:restore', [
            'path' => $backupRecord['path'],
        ]);

        if ($exitCode !== 0) {
            return back()->withErrors([
                'backup' => 'Failed to restore the selected backup.',
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Backup restored.']);

        return to_route('admin.posts.backups', $namespace);
    }

    public function downloadBackup(PostNamespace $namespace, string $backup): BinaryFileResponse
    {
        $backupRecord = $this->backupRecordFor($namespace, $backup);

        abort_unless($backupRecord !== null && File::exists($backupRecord['path']), 404);

        return response()->download($backupRecord['path'], $backupRecord['filename']);
    }

    public function uploadRestoreArchive(Request $request, NamespaceRestoreArchive $restoreArchive): RedirectResponse
    {
        $data = $request->validate([
            'backup' => ['required', 'file', 'extensions:zip'],
        ]);

        $token = $restoreArchive->storeUpload($data['backup']);

        try {
            $restoreArchive->preview($restoreArchive->tokenPath($token));
        } catch (\RuntimeException $exception) {
            $restoreArchive->deleteToken($token);

            return back()->withErrors([
                'backup' => $exception->getMessage(),
            ]);
        }

        return to_route('admin.posts.index', ['restore' => $token]);
    }

    public function streamRestoreArchive(string $token, NamespaceRestoreArchive $restoreArchive): StreamedResponse
    {
        abort_unless($restoreArchive->hasToken($token), 404);

        $path = $restoreArchive->tokenPath($token);

        return response()->eventStream(function () use ($restoreArchive, $path, $token) {
            try {
                foreach ($restoreArchive->restore($path) as $event) {
                    yield new StreamedEvent(
                        event: 'update',
                        data: json_encode([
                            'id' => (string) Str::uuid(),
                            ...$event,
                        ], JSON_THROW_ON_ERROR),
                    );
                }

                $restoreArchive->deleteToken($token);
            } catch (\RuntimeException $exception) {
                yield new StreamedEvent(
                    event: 'update',
                    data: json_encode([
                        'id' => (string) Str::uuid(),
                        'type' => 'error',
                        'message' => $exception->getMessage(),
                    ], JSON_THROW_ON_ERROR),
                );
            } finally {
                $restoreArchive->deleteToken($token);
            }
        });
    }

    public function create(PostNamespace $namespace): Response
    {
        return Inertia::render('admin/posts/create', [
            'namespace' => $namespace,
            'slugPrefix' => trim($namespace->full_path, '/').'/',
        ]);
    }

    public function store(StorePostRequest $request, PostNamespace $namespace): RedirectResponse
    {
        $post = Post::create([
            ...$request->validated(),
            'namespace_id' => $namespace->id,
            'user_id' => $request->user()->id,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post created.']);

        $returnTo = $this->safeReturnPath($request->string('return_to')->toString());

        if ($returnTo !== null) {
            return redirect()->to(route('posts.path', ['path' => $post->full_path], absolute: false));
        }

        return to_route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug]);
    }

    public function reorderPosts(Request $request, PostNamespace $namespace): RedirectResponse
    {
        $postSlugs = $namespace->posts()->pluck('slug')->all();
        $slugs = $request->validate([
            'slugs' => ['required', 'array'],
            'slugs.*' => ['string', 'distinct:strict', Rule::in($postSlugs)],
        ])['slugs'];

        $existingOrder = $namespace->post_order ?? [];
        $childSlugs = $namespace->children()->pluck('slug')->all();
        $namespaceSlugsInOrder = array_values(
            array_filter($existingOrder, fn (string $slug) => in_array($slug, $childSlugs, true))
        );

        $namespace->update(['post_order' => [...$namespaceSlugsInOrder, ...$slugs]]);

        return back();
    }

    public function reorderNamespaces(Request $request, PostNamespace $namespace): RedirectResponse
    {
        $childSlugs = $namespace->children()->pluck('slug')->all();
        $slugs = $request->validate([
            'slugs' => ['required', 'array'],
            'slugs.*' => ['string', 'distinct:strict', Rule::in($childSlugs)],
        ])['slugs'];

        $existingOrder = $namespace->post_order ?? [];
        $postSlugs = $namespace->posts()->pluck('slug')->all();
        $postSlugsInOrder = array_values(
            array_filter($existingOrder, fn (string $slug) => in_array($slug, $postSlugs, true))
        );

        $namespace->update(['post_order' => [...$slugs, ...$postSlugsInOrder]]);

        return back();
    }

    public function show(PostNamespace $namespace, Post $post): Response
    {
        return Inertia::render('admin/posts/show', [
            'namespace' => $namespace,
            'post' => $post->only([
                'id',
                'title',
                'slug',
                'full_path',
                'content',
                'is_draft',
                'published_at',
                'created_at',
                'page_views',
                'reference_title',
                'reference_url',
            ]),
        ]);
    }

    public function edit(PostNamespace $namespace, Post $post): Response
    {
        return Inertia::render('admin/posts/edit', [
            'namespace' => $namespace,
            'post' => $post->only([
                'id',
                'title',
                'slug',
                'full_path',
                'content',
                'is_draft',
                'published_at',
                'reference_title',
                'reference_url',
            ]),
            'slugPrefix' => trim($namespace->full_path, '/').'/',
        ]);
    }

    public function update(UpdatePostRequest $request, PostNamespace $namespace, Post $post): RedirectResponse
    {
        $data = $request->validated();
        $hasChanges = $post->title !== ($data['title'] ?? $post->title)
            || $post->content !== ($data['content'] ?? $post->content);

        if ($hasChanges) {
            $post->revisions()->create([
                'user_id' => $request->user()->id,
                'title' => $post->title,
                'content' => $post->content,
            ]);
        }

        $post->update($data);

        $fragment = $request->string('return_heading')->toString();
        $hash = $fragment !== '' ? '#'.rawurlencode(ltrim($fragment, '#')) : '';
        $returnTo = $this->safeReturnPath($request->string('return_to')->toString());

        if ($returnTo !== null) {
            if (str_starts_with($returnTo, '/admin/posts/')) {
                return redirect()->to(route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug], absolute: false).$hash);
            }

            return redirect()->to(route('posts.path', ['path' => $post->full_path], absolute: false).$hash);
        }

        return redirect()->route('admin.posts.edit', ['namespace' => $namespace, 'post' => $post->slug])
            ->setTargetUrl(route('admin.posts.edit', ['namespace' => $namespace, 'post' => $post->slug]).$hash);
    }

    public function revisions(PostNamespace $namespace, Post $post): Response
    {
        $revisions = $post->revisions()
            ->with('user')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (PostRevision $revision) => [
                'id' => $revision->id,
                'title' => $revision->title,
                'content' => $revision->content,
                'created_at' => $revision->created_at->toISOString(),
                'user' => $revision->user ? [
                    'id' => $revision->user->id,
                    'name' => $revision->user->name,
                ] : null,
                'is_current' => false,
            ]);

        $currentRevision = [
            'id' => 0,
            'title' => $post->title,
            'content' => $post->content,
            'created_at' => $post->updated_at?->toISOString(),
            'user' => null,
            'is_current' => true,
        ];

        return Inertia::render('admin/posts/revisions', [
            'namespace' => $namespace,
            'post' => $post->only(['id', 'slug', 'title']),
            'revisions' => $revisions->prepend($currentRevision)->values(),
        ]);
    }

    public function restore(
        RestorePostRevisionRequest $request,
        PostNamespace $namespace,
        Post $post,
        PostRevision $revision
    ): RedirectResponse {
        $post->revisions()->create([
            'user_id' => $request->user()->id,
            'title' => $post->title,
            'content' => $post->content,
        ]);

        $post->update([
            'title' => $revision->title,
            'content' => $revision->content,
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Revision restored.']);

        return to_route('admin.posts.revisions', ['namespace' => $namespace, 'post' => $post->slug]);
    }

    public function uploadNamespaceImage(UploadPostImageRequest $request, PostNamespace $namespace): RedirectResponse
    {
        $path = $request->file('image')->store("posts/{$namespace->full_path}", 'public');

        return to_route('admin.posts.create', $namespace)->with('imageUrl', '/images/'.$path);
    }

    public function uploadImage(UploadPostImageRequest $request, PostNamespace $namespace, Post $post): RedirectResponse
    {
        $path = $request->file('image')->store("posts/{$post->id}", 'public');

        return to_route('admin.posts.edit', ['namespace' => $namespace, 'post' => $post->slug])
            ->with('imageUrl', '/images/'.$path);
    }

    public function destroy(PostNamespace $namespace, Post $post): RedirectResponse
    {
        $post->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post deleted.']);

        return to_route('admin.posts.namespace', $namespace);
    }

    public function destroyMany(Request $request, PostNamespace $namespace): RedirectResponse
    {
        $postIds = $namespace->posts()->pluck('id')->all();
        $ids = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct:strict', Rule::in($postIds)],
        ])['ids'];

        $namespace->posts()->whereIn('id', $ids)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Selected posts deleted.']);

        return to_route('admin.posts.namespace', $namespace);
    }

    private function safeReturnPath(string $path): ?string
    {
        if ($path === '') {
            return null;
        }

        if (
            ! str_starts_with($path, '/')
            || str_starts_with($path, '//')
            || parse_url($path, PHP_URL_SCHEME) !== null
            || parse_url($path, PHP_URL_HOST) !== null
        ) {
            return null;
        }

        return $path;
    }

    private function backupCount(PostNamespace $namespace): int
    {
        return count($this->backupsForNamespace($namespace));
    }

    /**
     * @return array<int, array{
     *     filename: string,
     *     path: string,
     *     created_at: string,
     *     size_bytes: int,
     *     size_human: string,
     *     download_url: string,
     *     restore_url: string
     * }>
     */
    private function backupsForNamespace(PostNamespace $namespace): array
    {
        $backupDirectory = NamespaceBackupArchive::directory();

        if (! File::isDirectory($backupDirectory)) {
            return [];
        }

        $backupPaths = collect(
            File::glob($backupDirectory.'/'.NamespaceBackupArchive::currentPrefix($namespace).'-*.zip') ?: []
        );

        if (PostNamespace::query()->where('slug', $namespace->slug)->count() === 1) {
            $backupPaths = $backupPaths->merge(
                File::glob($backupDirectory.'/'.$namespace->slug.'-*.zip') ?: []
            );
        }

        return $backupPaths
            ->unique()
            ->filter(fn (string $path): bool => File::isFile($path))
            ->sortByDesc(fn (string $path): int => File::lastModified($path))
            ->values()
            ->map(fn (string $path): array => [
                'filename' => basename($path),
                'path' => $path,
                'created_at' => date(DATE_ATOM, File::lastModified($path)),
                'size_bytes' => File::size($path),
                'size_human' => $this->formatBytes(File::size($path)),
                'download_url' => route('admin.posts.backups.download', [
                    'namespace' => $namespace,
                    'backup' => basename($path),
                ], absolute: false),
                'restore_url' => route('admin.posts.backups.restore', [
                    'namespace' => $namespace,
                    'backup' => basename($path),
                ], absolute: false),
            ])
            ->all();
    }

    /**
     * @return array{
     *     filename: string,
     *     path: string,
     *     created_at: string,
     *     size_bytes: int,
     *     size_human: string,
     *     download_url: string,
     *     restore_url: string
     * }|null
     */
    private function backupRecordFor(PostNamespace $namespace, string $filename): ?array
    {
        return collect($this->backupsForNamespace($namespace))
            ->first(fn (array $backup): bool => $backup['filename'] === basename($filename));
    }

    private function formatBytes(int $bytes): string
    {
        if ($bytes < 1024) {
            return $bytes.' B';
        }

        if ($bytes < 1024 * 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return round($bytes / (1024 * 1024), 1).' MB';
    }
}
