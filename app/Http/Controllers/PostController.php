<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Support\ReservedContentPath;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('posts/index', [
            'namespaces' => PostNamespace::published()
                ->whereNull('parent_id')
                ->withCount(['posts' => fn ($q) => $q->where('is_draft', false)])
                ->orderBy('name')
                ->get(['id', 'slug', 'full_path', 'name', 'description', 'cover_image']),
        ]);
    }

    public function resolve(string $path): Response
    {
        $normalizedPath = trim($path, '/');

        abort_if(ReservedContentPath::startsWithReservedSegment($normalizedPath), 404);

        $post = Post::query()
            ->with('namespace:id,parent_id,slug,full_path,name,cover_image,is_published')
            ->where('full_path', $normalizedPath)
            ->where('is_draft', false)
            ->first();

        if ($post) {
            $ancestors = $this->ancestorChain($post->namespace);

            abort_unless($this->namespaceChainIsPublished($post->namespace, $ancestors), 404);

            return $this->renderPost($post, $ancestors);
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
        $children = $namespace->children()
            ->where('is_published', true)
            ->withCount(['posts' => fn ($query) => $query->where('is_draft', false)])
            ->get(['id', 'name', 'slug', 'full_path', 'description', 'cover_image']);

        $posts = $namespace->posts()
            ->where('is_draft', false)
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['id', 'slug', 'full_path', 'title', 'published_at']);

        return Inertia::render('posts/namespace', [
            'breadcrumbs' => $this->breadcrumbs($ancestors),
            'children' => $namespace->sortNamespaces($children),
            'namespace' => $namespace->only(['id', 'slug', 'full_path', 'name', 'description', 'cover_image_url']),
            'posts' => $namespace->sortPosts($posts),
        ]);
    }

    /**
     * @param  Collection<int, PostNamespace>  $ancestors
     */
    private function renderPost(Post $post, Collection $ancestors): Response
    {
        $namespace = $post->namespace;
        $posts = $namespace->posts()
            ->where('is_draft', false)
            ->orderBy('published_at')
            ->orderBy('id')
            ->get(['id', 'slug', 'full_path', 'title', 'published_at']);

        return Inertia::render('posts/show', [
            'breadcrumbs' => $this->breadcrumbs($ancestors),
            'namespace' => $namespace->only(['id', 'slug', 'full_path', 'name', 'cover_image_url']),
            'post' => $post->only(['id', 'slug', 'full_path', 'title', 'content', 'published_at']),
            'posts' => $namespace->sortPosts($posts),
        ]);
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
                ->select(['id', 'parent_id', 'name', 'full_path', 'is_published'])
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
