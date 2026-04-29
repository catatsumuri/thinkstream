<?php

namespace App\Http\Middleware;

use App\Models\PostNamespace;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'search' => [
                'namespaces' => fn () => PostNamespace::published()
                    ->whereNull('parent_id')
                    ->orderBy('name')
                    ->get(['id', 'name', 'full_path'])
                    ->map(fn (PostNamespace $namespace): array => [
                        'value' => $namespace->full_path,
                        'label' => $namespace->name,
                        'path' => '/'.$namespace->full_path,
                    ])
                    ->values()
                    ->all(),
            ],
            'thinkstream' => [
                'markdown_pages' => [
                    'enabled' => config('thinkstream.markdown_pages.enabled'),
                ],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'imageUrl' => session('imageUrl'),
            'thoughtImageUrl' => session('thoughtImageUrl'),
            'thoughtImageUpload' => session('thoughtImageUpload'),
        ];
    }
}
