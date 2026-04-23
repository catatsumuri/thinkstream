<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
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
        if ($namespace !== '' && $namespace !== 'guides') {
            return [];
        }

        $posts = Post::query()
            ->where('is_draft', false)
            ->where('published_at', '<=', now())
            ->whereHas('namespace', function ($builder): void {
                $builder
                    ->where('full_path', 'guides')
                    ->orWhere('full_path', 'like', 'guides/%');
            })
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit(6)
            ->get(['id', 'title', 'full_path', 'content']);

        $results = $posts->map(function (Post $post): array {
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
        });

        if ($query === '') {
            return $results->all();
        }

        $needle = Str::lower($query);

        return $results
            ->filter(fn (array $result): bool => collect([
                $result['page'],
                $result['path'],
                $result['excerpt'],
            ])->contains(
                fn (string $value): bool => Str::contains(Str::lower($value), $needle)
            ))
            ->values()
            ->all();
    }
}
