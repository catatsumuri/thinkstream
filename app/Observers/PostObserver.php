<?php

namespace App\Observers;

use App\Models\Post;
use App\Services\ContentPathService;

class PostObserver
{
    public function __construct(
        private readonly ContentPathService $contentPathService,
    ) {}

    public function saving(Post $post): void
    {
        $post->full_path = $this->contentPathService->buildPostPath($post);
    }
}
