<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Support\ReservedContentPath;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(): Response
    {
        $namespaces = PostNamespace::published()
            ->whereNull('parent_id')
            ->with('children')
            ->orderBy('name')
            ->get(['id', 'slug', 'full_path', 'name', 'description', 'cover_image']);

        $allDescendantIds = $namespaces->mapWithKeys(
            fn (PostNamespace $ns) => [$ns->id => $this->collectDescendantIds($ns)]
        );

        $postCounts = Post::query()
            ->whereIn('namespace_id', $allDescendantIds->flatten()->unique())
            ->tap(fn (Builder $query) => $this->applyPublishedPostScope($query))
            ->selectRaw('namespace_id, COUNT(*) as count')
            ->groupBy('namespace_id')
            ->pluck('count', 'namespace_id');

        $namespaces->each(function (PostNamespace $ns) use ($allDescendantIds, $postCounts): void {
            $ns->posts_count = $allDescendantIds[$ns->id]->sum(fn (int $id) => $postCounts->get($id, 0));
        });

        return Inertia::render('posts/index', [
            'namespaces' => $namespaces,
        ]);
    }

    /**
     * @return Collection<int, int>
     */
    private function collectDescendantIds(PostNamespace $namespace): Collection
    {
        return collect([$namespace->id])->merge(
            $namespace->children->flatMap(fn (PostNamespace $child) => $this->collectDescendantIds($child))
        );
    }

    public function resolve(string $path): Response
    {
        $normalizedPath = trim($path, '/');

        abort_if(ReservedContentPath::startsWithReservedSegment($normalizedPath), 404);

        $post = Post::query()
            ->with('namespace:id,parent_id,slug,full_path,name,cover_image,is_published')
            ->where('full_path', $normalizedPath)
            ->tap(fn (Builder $query) => $this->applyPublishedPostScope($query))
            ->first();

        if ($post) {
            $ancestors = $this->ancestorChain($post->namespace);

            abort_unless($this->namespaceChainIsPublished($post->namespace, $ancestors), 404);

            return $this->renderPost($post, $ancestors);
        }

        if (auth()->check()) {
            $previewPost = Post::query()
                ->with('namespace:id,parent_id,slug,full_path,name,cover_image,is_published')
                ->where('full_path', $normalizedPath)
                ->first();

            if ($previewPost) {
                $ancestors = $this->ancestorChain($previewPost->namespace);

                return $this->renderPost($previewPost, $ancestors, preview: true);
            }
        }

        $namespace = PostNamespace::query()
            ->where('full_path', $normalizedPath)
            ->where('is_published', true)
            ->firstOrFail();

        $ancestors = $this->ancestorChain($namespace);

        abort_unless($this->namespaceChainIsPublished($namespace, $ancestors), 404);

        return $this->renderNamespace($namespace, $ancestors);
    }

    /**
     * @param  Collection<int, PostNamespace>  $ancestors
     */
    private function renderNamespace(PostNamespace $namespace, Collection $ancestors): Response
    {
        $rootNamespace = $this->rootNamespace($namespace, $ancestors);
        $children = $namespace->children()
            ->where('is_published', true)
            ->withCount(['posts' => fn (Builder $query) => $this->applyPublishedPostScope($query)])
            ->get(['id', 'name', 'slug', 'full_path', 'description', 'cover_image']);

        $posts = $namespace->posts()
            ->tap(fn (Builder $query) => $this->applyPublishedPostScope($query))
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['id', 'slug', 'full_path', 'title', 'published_at']);

        return Inertia::render('posts/namespace', [
            'breadcrumbs' => $this->breadcrumbs($ancestors),
            'children' => $namespace->sortNamespaces($children),
            'navRoot' => $this->buildNavigationNode($rootNamespace),
            'namespace' => $namespace->only(['id', 'slug', 'full_path', 'name', 'description', 'cover_image_url', 'is_published']),
            'posts' => $namespace->sortPosts($posts),
        ]);
    }

    /**
     * @param  Collection<int, PostNamespace>  $ancestors
     */
    private function renderPost(Post $post, Collection $ancestors, bool $preview = false): Response
    {
        $namespace = $post->namespace;
        $rootNamespace = $this->rootNamespace($namespace, $ancestors);
        $posts = $namespace->posts()
            ->tap(fn (Builder $query) => $this->applyPublishedPostScope($query))
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['id', 'slug', 'full_path', 'title', 'published_at']);

        return Inertia::render('posts/show', [
            'breadcrumbs' => $this->breadcrumbs($ancestors),
            'cardImage' => $this->resolveCardImage($post, $namespace),
            'navRoot' => $this->buildNavigationNode($rootNamespace),
            'namespace' => $namespace->only(['id', 'slug', 'full_path', 'name', 'cover_image_url']),
            'postUrl' => route('posts.path', ['path' => $post->full_path]),
            'post' => $post->only(['id', 'slug', 'full_path', 'title', 'content', 'published_at', 'updated_at']),
            'posts' => $namespace->sortPosts($posts),
            'preview' => $preview ? [
                'status' => $post->is_draft ? 'draft' : 'scheduled',
                'published_at' => $post->published_at?->toISOString(),
            ] : null,
        ]);
    }

    private function resolveCardImage(Post $post, PostNamespace $namespace): ?string
    {
        // 1. First image in post content
        if (preg_match('/!\[[^\]]*\]\(([^)]+)\)/', $post->content, $matches)) {
            $url = $matches[1];

            return str_starts_with($url, 'http') ? $url : url($url);
        }

        // 2. Namespace cover image
        if ($namespace->cover_image_url) {
            return url($namespace->cover_image_url);
        }

        // 3. Parent namespace cover image
        if ($namespace->parent_id) {
            $parent = PostNamespace::select(['id', 'cover_image'])->find($namespace->parent_id);
            if ($parent?->cover_image_url) {
                return url($parent->cover_image_url);
            }
        }

        return null;
    }

    /**
     * @param  Collection<int, PostNamespace>  $ancestors
     */
    private function rootNamespace(PostNamespace $namespace, Collection $ancestors): PostNamespace
    {
        return $ancestors->first() ?? $namespace;
    }

    private function applyPublishedPostScope(Builder $query): Builder
    {
        return $query
            ->where('is_draft', false)
            ->where('published_at', '<=', now());
    }

    /**
     * @return array{
     *     name: string,
     *     full_path: string,
     *     children: array<int, array{name: string, full_path: string, children: array, posts: array<int, array{title: string, full_path: string}>}>,
     *     posts: array<int, array{title: string, full_path: string}>
     * }
     */
    private function buildNavigationNode(PostNamespace $namespace): array
    {
        $children = $namespace->children()
            ->where('is_published', true)
            ->get(['id', 'slug', 'full_path', 'name', 'post_order']);

        $posts = $namespace->sortPosts($namespace->posts()
            ->tap(fn (Builder $query) => $this->applyPublishedPostScope($query))
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['title', 'full_path', 'slug']));

        return [
            'name' => $namespace->name,
            'full_path' => $namespace->full_path,
            'children' => $namespace->sortNamespaces($children)
                ->map(fn (PostNamespace $child) => $this->buildNavigationNode($child))
                ->values()
                ->all(),
            'posts' => $posts
                ->map(fn (Post $post) => [
                    'title' => $post->title,
                    'full_path' => $post->full_path,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<int, array{name: string, full_path: string}>
     */
    private function breadcrumbs(Collection $ancestors): array
    {
        return $ancestors
            ->map(fn (PostNamespace $ancestor) => [
                'name' => $ancestor->name,
                'full_path' => $ancestor->full_path,
            ])
            ->values()
            ->all();
    }

    /**
     * @return Collection<int, PostNamespace>
     */
    private function ancestorChain(PostNamespace $namespace): Collection
    {
        $ancestors = collect();
        $currentParentId = $namespace->parent_id;

        while ($currentParentId) {
            $ancestor = PostNamespace::query()
                ->select(['id', 'parent_id', 'name', 'full_path', 'is_published', 'post_order'])
                ->findOrFail($currentParentId);

            $ancestors->prepend($ancestor);
            $currentParentId = $ancestor->parent_id;
        }

        return $ancestors;
    }

    /**
     * @param  Collection<int, PostNamespace>  $ancestors
     */
    private function namespaceChainIsPublished(PostNamespace $namespace, Collection $ancestors): bool
    {
        return $namespace->is_published
            && $ancestors->every(fn (PostNamespace $ancestor): bool => $ancestor->is_published);
    }
}
