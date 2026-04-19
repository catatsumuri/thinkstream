<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Http\Requests\Admin\UploadPostImageRequest;
use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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

    public function namespaceIndex(PostNamespace $namespace): Response
    {
        return Inertia::render('admin/posts/namespace', [
            'namespace' => $namespace,
            'ancestors' => $namespace->ancestors()->map(fn (PostNamespace $ns) => ['id' => $ns->id, 'name' => $ns->name]),
            'children' => $namespace->sortNamespaces($namespace->children()->withCount('posts')->get()),
            'posts' => $namespace->sortPosts($namespace->posts()->latest()->get(['id', 'title', 'slug', 'is_draft', 'published_at', 'created_at'])),
        ]);
    }

    public function create(PostNamespace $namespace): Response
    {
        return Inertia::render('admin/posts/create', [
            'namespace' => $namespace,
            'slugPrefix' => $namespace->full_path !== $namespace->slug
                ? trim($namespace->full_path, '/').'/'
                : null,
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

        return to_route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug]);
    }

    public function show(PostNamespace $namespace, Post $post): Response
    {
        return Inertia::render('admin/posts/show', [
            'namespace' => $namespace,
            'post' => $post,
        ]);
    }

    public function edit(PostNamespace $namespace, Post $post): Response
    {
        return Inertia::render('admin/posts/edit', [
            'namespace' => $namespace,
            'post' => $post,
        ]);
    }

    public function update(UpdatePostRequest $request, PostNamespace $namespace, Post $post): RedirectResponse
    {
        $post->update($request->validated());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Post saved.']);

        $fragment = $request->string('return_heading')->toString();
        $hash = $fragment !== '' ? '#'.ltrim($fragment, '#') : '';

        return redirect()->route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug])
            ->setTargetUrl(route('admin.posts.show', ['namespace' => $namespace, 'post' => $post->slug]).$hash);
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
}
