<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SearchController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $query = $request->string('q')->trim()->toString();
        $namespace = $request->string('namespace')->trim()->toString();

        return Inertia::render('search/index', [
            'query' => $query,
            'namespace' => $namespace,
            'results' => $this->results($query, $namespace),
        ]);
    }

    /**
     * @return list<array{
     *     id: int,
     *     page: string,
     *     path: string,
     *     href: string,
     *     excerpt: string
     * }>
     */
    private function results(string $query, string $namespace): array
    {
        $posts = $query === ''
            ? Post::query()
                ->with('namespace:id,full_path')
                ->published()
                ->withinNamespace($namespace)
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->limit(6)
                ->get(['id', 'namespace_id', 'title', 'full_path', 'content', 'published_at'])
            : $this->searchResults($query, $namespace);

        return $posts
            ->map(fn (Post $post): array => $this->mapResult($post))
            ->values()
            ->all();
    }

    /**
     * @return Collection<int, Post>
     */
    private function searchResults(string $query, string $namespace)
    {
        $scoutResults = Post::search($query)
            ->query(fn (Builder $builder) => $builder
                ->with('namespace:id,full_path')
                ->published()
                ->withinNamespace($namespace)
            )
            ->take(10)
            ->get();

        $tagResults = Post::query()
            ->with('namespace:id,full_path')
            ->published()
            ->withinNamespace($namespace)
            ->whereHas('tags', fn (Builder $builder) => $builder->where(
                'name',
                'like',
                '%'.$this->escapeLike($query).'%',
            ))
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get(['id', 'namespace_id', 'title', 'full_path', 'content', 'published_at']);

        return $scoutResults
            ->concat($tagResults)
            ->unique('id')
            ->take(10)
            ->values();
    }

    private function escapeLike(string $value): string
    {
        return addcslashes($value, '\%_');
    }

    /**
     * @return array{
     *     id: int,
     *     page: string,
     *     path: string,
     *     href: string,
     *     excerpt: string
     * }
     */
    private function mapResult(Post $post): array
    {
        $excerpt = Str::of($post->content)
            ->replaceMatches('/[`#>*_\-\[\]\(\)!]/', ' ')
            ->replaceMatches('/\s+/', ' ')
            ->trim()
            ->substr(0, 140)
            ->toString();

        return [
            'id' => $post->id,
            'page' => $post->title,
            'path' => '/'.$post->full_path,
            'href' => route('posts.path', ['path' => $post->full_path]),
            'excerpt' => $excerpt,
        ];
    }
}
