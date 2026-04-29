<?php

namespace App\Http\Controllers\Admin;

use App\Ai\Agents\MarkdownStructureAgent;
use App\Ai\Agents\TranslateSelectionAgent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RestorePostRevisionRequest;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Http\Requests\Admin\UploadPostImageRequest;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostRevision;
use App\Models\Tag;
use App\Support\AiCostCalculator;
use App\Support\ContentPathConflict;
use App\Support\NamespaceBackupIndex;
use App\Support\NamespaceRestoreArchive;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\StreamedEvent;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Yaml\Yaml;

class PostController extends Controller
{
    public function index(Request $request): Response
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

        return Inertia::render('admin/posts/index', [
            'namespaces' => $namespaces,
            'sort' => ['column' => $column, 'direction' => $direction],
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

    public function namespaceIndex(PostNamespace $namespace, NamespaceBackupIndex $backupIndex): Response
    {
        $posts = $namespace->sortPosts($namespace->posts()->with('tags')->orderBy('published_at')->orderBy('id')->get([
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
            'tags' => $post->tags->map(fn (Tag $tag) => ['id' => $tag->id, 'name' => $tag->name])->values()->all(),
        ]);

        $backupCount = $backupIndex->countForNamespace($namespace);

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

    public function backups(PostNamespace $namespace, NamespaceBackupIndex $backupIndex): Response
    {
        return Inertia::render('admin/posts/backups', [
            'namespace' => [
                'id' => $namespace->id,
                'name' => $namespace->name,
                'slug' => $namespace->slug,
                'full_path' => $namespace->full_path,
                'backup_count' => $backupIndex->countForNamespace($namespace),
            ],
            'create_backup_url' => route('admin.posts.backups.store', $namespace, absolute: false),
            'delete_backups_url' => route('admin.posts.backups.destroyMany', $namespace, absolute: false),
            'backups' => collect($backupIndex->filesForNamespace($namespace))
                ->map(fn (array $backup): array => [
                    'filename' => $backup['filename'],
                    'created_at' => $backup['created_at'],
                    'size_bytes' => $backup['size_bytes'],
                    'size_human' => $backup['size_human'],
                    'description' => $backup['archive']['description'],
                    'download_url' => route('admin.posts.backups.download', [
                        'namespace' => $namespace,
                        'backup' => $backup['filename'],
                    ], absolute: false),
                    'restore_url' => route('admin.posts.backups.restore', [
                        'namespace' => $namespace,
                        'backup' => $backup['filename'],
                    ], absolute: false),
                ])
                ->all(),
        ]);
    }

    public function storeBackup(Request $request, PostNamespace $namespace): RedirectResponse
    {
        $data = $request->validate([
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $description = trim((string) ($data['description'] ?? ''));

        $arguments = [
            'namespace' => $namespace->id,
        ];

        if ($description !== '') {
            $arguments['--description'] = $description;
        }

        $exitCode = Artisan::call('namespace:backup', $arguments);

        if ($exitCode !== 0) {
            return back()->withErrors([
                'backup' => 'Failed to create a new backup.',
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Backup created.']);

        return to_route('admin.posts.backups', $namespace);
    }

    public function destroyManyBackups(
        Request $request,
        PostNamespace $namespace,
        NamespaceBackupIndex $backupIndex
    ): RedirectResponse {
        $availableFilenames = collect($backupIndex->filesForNamespace($namespace))
            ->pluck('filename')
            ->all();

        $data = $request->validate([
            'filenames' => ['required', 'array', 'min:1'],
            'filenames.*' => ['string', 'distinct:strict', Rule::in($availableFilenames)],
        ]);

        foreach ($data['filenames'] as $filename) {
            $backupRecord = $backupIndex->fileForNamespace($namespace, $filename);

            if ($backupRecord !== null && File::exists($backupRecord['path'])) {
                File::delete($backupRecord['path']);
            }
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Selected backups deleted.']);

        return to_route('admin.posts.backups', $namespace);
    }

    public function restoreBackup(
        Request $request,
        PostNamespace $namespace,
        string $backup,
        NamespaceBackupIndex $backupIndex
    ): RedirectResponse {
        $request->validate([
            'confirmation' => ['required', 'string', Rule::in([$namespace->name])],
        ]);

        $backupRecord = $backupIndex->fileForNamespace($namespace, $backup);

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

    public function downloadBackup(
        PostNamespace $namespace,
        string $backup,
        NamespaceBackupIndex $backupIndex
    ): BinaryFileResponse {
        $backupRecord = $backupIndex->fileForNamespace($namespace, $backup);

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

        return to_route('admin.backups.index', ['restore' => $token]);
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
            'availableTags' => Tag::orderBy('name')->pluck('name')->all(),
            'slugPrefix' => trim($namespace->full_path, '/').'/',
        ]);
    }

    private function syncTags(Post $post, array $rawTags): void
    {
        $tagIds = collect($rawTags)
            ->map(fn (string $t) => mb_strtolower(trim($t)))
            ->filter(fn (string $t) => $t !== '')
            ->unique()
            ->map(fn (string $name) => Tag::firstOrCreate(['name' => $name])->id)
            ->all();

        $post->tags()->sync($tagIds);
    }

    public function store(StorePostRequest $request, PostNamespace $namespace): RedirectResponse
    {
        $data = $request->validated();
        $tags = $data['tags'] ?? [];

        $post = Post::create([
            ...collect($data)->except('tags')->all(),
            'namespace_id' => $namespace->id,
            'user_id' => $request->user()->id,
        ]);

        $this->syncTags($post, $tags);

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
        $rootNamespace = $this->rootNamespace($namespace);
        $post->load('tags', 'referrers');

        return Inertia::render('admin/posts/show', [
            'namespace' => [
                'id' => $namespace->id,
                'name' => $namespace->name,
                'slug' => $namespace->slug,
                'full_path' => $namespace->full_path,
                'is_system' => (bool) $namespace->is_system,
            ],
            'availableMoveNamespaces' => $this->availableMoveNamespaces($namespace),
            'navRoot' => $this->buildNavigationTree($rootNamespace),
            'post' => [
                ...$post->only([
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
                'is_syncing' => $post->is_syncing,
                'sync_file_path' => $post->sync_file_path,
                'tags' => $post->tags->pluck('name')->values()->all(),
                'referrers' => $post->referrers
                    ->sortByDesc('count')
                    ->take(10)
                    ->map(fn ($referrer) => [
                        'http_referer' => $referrer->http_referer,
                        'http_referer_url' => $this->safeExternalUrl($referrer->http_referer),
                        'count' => $referrer->count,
                        'last_seen_at' => $referrer->last_seen_at?->toISOString(),
                    ])
                    ->values()
                    ->all(),
            ],
        ]);
    }

    public function moveToNamespace(Request $request, PostNamespace $namespace, Post $post): RedirectResponse
    {
        $availableNamespaceIds = PostNamespace::query()
            ->where(fn ($query) => $query->where('is_system', false)->orWhereNull('is_system'))
            ->whereKeyNot($namespace->id)
            ->pluck('id')
            ->all();

        $data = $request->validate([
            'target_namespace_id' => ['required', 'integer', Rule::in($availableNamespaceIds)],
        ]);

        $targetNamespace = PostNamespace::query()
            ->select(['id', 'slug', 'full_path', 'name'])
            ->findOrFail($data['target_namespace_id']);

        $newSlug = $this->resolveAvailableSlugForNamespace($post, $targetNamespace->id);

        $post->update([
            'namespace_id' => $targetNamespace->id,
            'slug' => $newSlug,
            'full_path' => trim(implode('/', array_filter([$targetNamespace->full_path, $newSlug])), '/'),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post moved to namespace.']);

        return to_route('admin.posts.show', ['namespace' => $targetNamespace, 'post' => $post->slug]);
    }

    /**
     * @return array<int, array{id: int, name: string, full_path: string}>
     */
    private function availableMoveNamespaces(PostNamespace $currentNamespace): array
    {
        return PostNamespace::query()
            ->where(fn ($query) => $query->where('is_system', false)->orWhereNull('is_system'))
            ->whereKeyNot($currentNamespace->id)
            ->orderBy('full_path')
            ->get(['id', 'name', 'full_path'])
            ->map(fn (PostNamespace $namespace) => [
                'id' => $namespace->id,
                'name' => $namespace->name,
                'full_path' => $namespace->full_path,
            ])
            ->all();
    }

    private function resolveAvailableSlugForNamespace(Post $post, int $targetNamespaceId): string
    {
        $baseSlug = $post->slug;
        $slug = $baseSlug;
        $counter = 2;

        while (ContentPathConflict::findPostConflict($targetNamespaceId, $slug, $post) !== null) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function safeExternalUrl(?string $url): ?string
    {
        $candidate = trim((string) $url);

        if ($candidate === '' || filter_var($candidate, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $scheme = parse_url($candidate, PHP_URL_SCHEME);

        if (! is_string($scheme) || ! in_array(strtolower($scheme), ['http', 'https'], true)) {
            return null;
        }

        return $candidate;
    }

    private function rootNamespace(PostNamespace $namespace): PostNamespace
    {
        $root = $namespace;

        while ($root->parent_id) {
            $root = PostNamespace::select(['id', 'parent_id', 'slug', 'full_path', 'name', 'post_order'])
                ->findOrFail($root->parent_id);
        }

        return $root;
    }

    private function buildNavigationTree(PostNamespace $rootNamespace): array
    {
        $rootPath = trim($rootNamespace->full_path, '/');

        $namespaceQuery = PostNamespace::query();

        if ($rootPath !== '') {
            $namespaceQuery
                ->whereKey($rootNamespace->id)
                ->orWhere('full_path', 'like', $rootPath.'/%');
        }

        $namespaces = $namespaceQuery
            ->get(['id', 'parent_id', 'slug', 'full_path', 'name', 'post_order'])
            ->keyBy('id');

        $namespacesByParent = $namespaces
            ->groupBy(fn (PostNamespace $namespace): int => $namespace->parent_id ?? 0)
            ->map(fn ($group) => $group->values());

        $namespaceIds = $rootPath === ''
            ? $this->navigationSubtreeNamespaceIds($rootNamespace->id, $namespacesByParent->all())
            : $namespaces->keys()->all();

        $postsByNamespace = Post::query()
            ->whereIn('namespace_id', $namespaceIds)
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['namespace_id', 'title', 'full_path', 'slug'])
            ->groupBy('namespace_id')
            ->map(fn ($group) => $group->values());

        return $this->buildNavigationNode($rootNamespace, $namespacesByParent->all(), $postsByNamespace->all());
    }

    /**
     * @param  array<int, Collection<int, PostNamespace>>  $namespacesByParent
     * @return array<int, int>
     */
    private function navigationSubtreeNamespaceIds(int $rootNamespaceId, array $namespacesByParent): array
    {
        $namespaceIds = [$rootNamespaceId];
        $pendingParentIds = [$rootNamespaceId];

        while ($pendingParentIds !== []) {
            $parentId = array_pop($pendingParentIds);

            if ($parentId === null) {
                continue;
            }

            foreach ($namespacesByParent[$parentId] ?? [] as $childNamespace) {
                $namespaceIds[] = $childNamespace->id;
                $pendingParentIds[] = $childNamespace->id;
            }
        }

        return $namespaceIds;
    }

    /**
     * @return array{
     *     name: string,
     *     full_path: string,
     *     href: string,
     *     children: array<int, mixed>,
     *     posts: array<int, array{title: string, full_path: string, href: string}>
     * }
     */
    private function buildNavigationNode(PostNamespace $namespace, array $namespacesByParent, array $postsByNamespace): array
    {
        /** @var Collection<int, PostNamespace> $children */
        $children = collect($namespacesByParent[$namespace->id] ?? []);
        /** @var Collection<int, Post> $posts */
        $posts = $namespace->sortPosts(collect($postsByNamespace[$namespace->id] ?? []));

        return [
            'name' => $namespace->name,
            'full_path' => $namespace->full_path,
            'href' => route('admin.posts.namespace', ['namespace' => $namespace], absolute: false),
            'children' => $namespace->sortNamespaces($children)
                ->map(fn (PostNamespace $child) => $this->buildNavigationNode($child, $namespacesByParent, $postsByNamespace))
                ->values()
                ->all(),
            'posts' => $posts->map(fn (Post $post) => [
                'title' => $post->title,
                'full_path' => $post->full_path,
                'href' => route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug], absolute: false),
            ])->values()->all(),
        ];
    }

    public function edit(PostNamespace $namespace, Post $post): Response
    {
        $post->load('tags');

        return Inertia::render('admin/posts/edit', [
            'namespace' => $namespace,
            'post' => [
                ...$post->only([
                    'id',
                    'title',
                    'slug',
                    'full_path',
                    'content',
                    'is_draft',
                    'published_at',
                    'reference_title',
                    'reference_url',
                    'is_syncing',
                    'sync_file_path',
                ]),
                'tags' => $post->tags->pluck('name')->values()->all(),
            ],
            'availableTags' => Tag::orderBy('name')->pluck('name')->all(),
            'slugPrefix' => trim($namespace->full_path, '/').'/',
            'aiEnabled' => config('thinkstream.ai.enabled'),
        ]);
    }

    public function update(UpdatePostRequest $request, PostNamespace $namespace, Post $post): RedirectResponse
    {
        abort_if($post->is_syncing, 403, 'This post is in sync mode. Edit the local file to make changes.');

        $data = $request->validated();
        $tags = $data['tags'] ?? [];
        $filteredData = collect($data)->except('tags')->all();

        if ($namespace->is_system) {
            $filteredData['is_draft'] = true;
            unset($filteredData['published_at']);
        }

        $hasChanges = $post->title !== ($filteredData['title'] ?? $post->title)
            || $post->content !== ($filteredData['content'] ?? $post->content);

        if ($hasChanges) {
            $post->revisions()->create([
                'user_id' => $request->user()->id,
                'title' => $post->title,
                'content' => $post->content,
            ]);
        }

        $post->update($filteredData);
        $this->syncTags($post, $tags);

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

    public function structureMarkdown(Request $request, PostNamespace $namespace, Post $post): JsonResponse
    {
        abort_unless(config('thinkstream.ai.enabled'), 403);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:50000'],
        ]);

        $agentResponse = (new MarkdownStructureAgent)->prompt($validated['content']);

        $cost = AiCostCalculator::forText($agentResponse->meta, $agentResponse->usage);

        Log::info('Markdown structured with AI', [
            'post_id' => $post->id,
            'agent_model' => $agentResponse->meta->model,
            'agent_usage' => $agentResponse->usage->toArray(),
            'cost_usd' => $cost,
        ]);

        $message = $cost !== null
            ? __('Content structured. (cost: $:cost)', ['cost' => number_format($cost, 4)])
            : __('Content structured.');

        return response()->json([
            'content' => $agentResponse['content'],
            'message' => $message,
        ]);
    }

    public function translateMarkdown(Request $request, PostNamespace $namespace, Post $post): JsonResponse
    {
        abort_unless(config('thinkstream.ai.enabled'), 403);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:50000'],
        ]);

        $locale = (string) config('app.locale', 'en');
        $targetLanguage = \Locale::getDisplayLanguage($locale, 'en') ?: $locale;

        $agentResponse = (new TranslateSelectionAgent($targetLanguage))->prompt($validated['content']);

        $cost = AiCostCalculator::forText($agentResponse->meta, $agentResponse->usage);

        Log::info('Markdown translated with AI', [
            'post_id' => $post->id,
            'target_language' => $targetLanguage,
            'agent_model' => $agentResponse->meta->model,
            'agent_usage' => $agentResponse->usage->toArray(),
            'cost_usd' => $cost,
        ]);

        $message = $cost !== null
            ? __('Translated to :language. (cost: $:cost)', ['language' => $targetLanguage, 'cost' => number_format($cost, 4)])
            : __('Translated to :language.', ['language' => $targetLanguage]);

        return response()->json([
            'content' => $agentResponse['content'],
            'message' => $message,
        ]);
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

    public function storeSyncFile(PostNamespace $namespace, Post $post): RedirectResponse
    {
        abort_if($post->is_syncing, 409, 'Post is already in sync mode.');
        abort_if(! $post->full_path, 422, 'Post has no full path.');

        $syncDir = rtrim((string) config('thinkstream.sync.directory', storage_path('app/private/sync')), '/');

        $filePath = $syncDir.'/'.$post->full_path.'.md';
        $fileDir = dirname($filePath);

        if (! is_dir($fileDir)) {
            File::makeDirectory($fileDir, 0755, true);
        }

        $post->load('tags');

        $frontmatter = [
            'title' => $post->title,
            'tags' => $post->tags->pluck('name')->all(),
        ];

        File::put($filePath, "---\n".Yaml::dump($frontmatter)."---\n\n".$post->content);

        $post->forceFill([
            'is_syncing' => true,
            'sync_file_path' => $filePath,
            'last_synced_at' => now(),
        ])->saveQuietly();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sync file created.']);

        return redirect()->route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug]);
    }

    public function destroySyncFile(PostNamespace $namespace, Post $post): RedirectResponse
    {
        abort_unless($post->is_syncing, 404);

        $path = $post->sync_file_path;

        if ($path && File::exists($path)) {
            File::delete($path);
        }

        $post->forceFill([
            'is_syncing' => false,
            'sync_file_path' => null,
            'last_synced_at' => null,
        ])->saveQuietly();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sync file deleted. Post is now editable.']);

        return redirect()->route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug]);
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
}
