<?php

namespace App\Observers;

use App\Models\PostNamespace;
use App\Services\ContentPathService;

class PostNamespaceObserver
{
    public function __construct(
        private readonly ContentPathService $contentPathService,
    ) {}

    public function saving(PostNamespace $postNamespace): void
    {
        $postNamespace->full_path = $this->contentPathService->buildNamespacePath($postNamespace);
    }

    public function saved(PostNamespace $postNamespace): void
    {
        if ($postNamespace->wasRecentlyCreated || $postNamespace->wasChanged(['slug', 'parent_id', 'full_path'])) {
            $this->contentPathService->syncNamespaceSubtree($postNamespace);
        }
    }
}
