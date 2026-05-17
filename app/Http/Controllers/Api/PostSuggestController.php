<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostSuggestController extends Controller
{
    public function suggest(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:100']]);

        $q = $request->string('q')->toString();

        $posts = Post::published()
            ->when($q, fn ($query) => $query->where(
                fn ($sub) => $sub
                    ->where('title', 'like', "%{$q}%")
                    ->orWhere('full_path', 'like', "%{$q}%")
            ))
            ->orderByDesc('published_at')
            ->limit(8)
            ->get(['title', 'full_path']);

        return response()->json($posts);
    }
}
