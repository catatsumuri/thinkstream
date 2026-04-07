<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('posts/index', [
            'posts' => Post::whereNotNull('published_at')
                ->orderByDesc('published_at')
                ->get(),
        ]);
    }
}
