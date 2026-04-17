<?php

namespace App\Services;

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

class InertiaJsDocsImporter
{
    /**
     * @var array<string, array{name: string, posts: array<int, string>}>
     */
    private const SECTION_DEFINITIONS = [
        'getting-started' => [
            'name' => 'Getting Started',
            'posts' => ['index', 'demo-application', 'upgrade-guide'],
        ],
        'installation' => [
            'name' => 'Installation',
            'posts' => ['server-side-setup', 'client-side-setup'],
        ],
        'core-concepts' => [
            'name' => 'Core Concepts',
            'posts' => ['who-is-it-for', 'how-it-works', 'the-protocol'],
        ],
        'the-basics' => [
            'name' => 'The Basics',
            'posts' => [
                'pages',
                'responses',
                'redirects',
                'routing',
                'title-and-meta',
                'links',
                'manual-visits',
                'instant-visits',
                'forms',
                'http-requests',
                'optimistic-updates',
                'file-uploads',
                'validation',
                'layouts',
                'view-transitions',
            ],
        ],
        'data-props' => [
            'name' => 'Data & Props',
            'posts' => [
                'shared-data',
                'flash-data',
                'partial-reloads',
                'deferred-props',
                'merging-props',
                'once-props',
                'polling',
                'prefetching',
                'load-when-visible',
                'infinite-scroll',
                'remembering-state',
            ],
        ],
        'security' => [
            'name' => 'Security',
            'posts' => [
                'authentication',
                'authorization',
                'csrf-protection',
                'history-encryption',
            ],
        ],
        'advanced' => [
            'name' => 'Advanced',
            'posts' => [
                'asset-versioning',
                'code-splitting',
                'error-handling',
                'events',
                'progress-indicators',
                'scroll-management',
                'server-side-rendering',
                'testing',
                'typescript',
            ],
        ],
    ];

    /**
     * @return array{
     *     imported: bool,
     *     message: string,
     *     namespace_slug?: string,
     *     post_count?: int,
     *     source_path?: string
     * }
     */
    public function import(
        string $sourcePath,
        string $namespaceSlug,
        string $namespaceName,
        string $namespaceDescription,
        string $userEmail,
    ): array {
        $absoluteSourcePath = base_path($sourcePath);

        if (! File::isDirectory($absoluteSourcePath)) {
            return [
                'imported' => false,
                'message' => "Source directory [{$sourcePath}] was not found.",
            ];
        }

        $documents = $this->discoverDocuments(
            absoluteSourcePath: $absoluteSourcePath,
            docsVersion: basename($absoluteSourcePath),
        );

        if ($documents->isEmpty()) {
            return [
                'imported' => false,
                'message' => "No MDX files were found in [{$sourcePath}].",
            ];
        }

        $docsVersion = basename($absoluteSourcePath);
        $pathMap = $documents
            ->mapWithKeys(fn (array $document): array => [
                $document['doc_path'] => $document['target_path'],
                $document['doc_path'].'/index' => $document['target_path'],
            ])
            ->all();

        $user = User::query()->firstOrCreate(
            ['email' => $userEmail],
            [
                'name' => 'Docs Importer',
                'password' => bcrypt(Str::random(40)),
            ],
        );

        $namespace = PostNamespace::query()->updateOrCreate(
            [
                'parent_id' => null,
                'slug' => $namespaceSlug,
            ],
            [
                'name' => $namespaceName,
                'description' => $namespaceDescription,
                'is_published' => true,
            ],
        );

        $sectionNamespaces = $documents
            ->groupBy('section')
            ->map(function (Collection $sectionDocuments, string $section) use ($namespace): PostNamespace {
                return PostNamespace::query()->updateOrCreate(
                    [
                        'parent_id' => $namespace->id,
                        'slug' => $section,
                    ],
                    [
                        'name' => $this->sectionName($section),
                        'description' => null,
                        'is_published' => true,
                        'post_order' => $this->sectionPostOrder($section, $sectionDocuments),
                    ],
                );
            });

        $namespace->update([
            'post_order' => $this->sectionNamespaceOrder($sectionNamespaces),
        ]);

        $publishedAt = now();

        $documents->each(function (array $document) use ($sectionNamespaces, $namespaceSlug, $pathMap, $docsVersion, $user, $publishedAt): void {
            /** @var PostNamespace $sectionNamespace */
            $sectionNamespace = $sectionNamespaces->get($document['section']);

            Post::query()->updateOrCreate(
                [
                    'namespace_id' => $sectionNamespace->id,
                    'slug' => $document['slug'],
                ],
                [
                    'user_id' => $user->id,
                    'title' => $document['title'],
                    'content' => $this->rewriteInternalLinks(
                        markdown: $document['content'],
                        namespaceSlug: $namespaceSlug,
                        docsVersion: $docsVersion,
                        pathMap: $pathMap,
                    ),
                    'is_draft' => false,
                    'published_at' => $publishedAt,
                ],
            );
        });

        return [
            'imported' => true,
            'message' => 'Imported Inertia.js documentation successfully.',
            'namespace_slug' => $namespace->slug,
            'post_count' => $documents->count(),
            'source_path' => $sourcePath,
        ];
    }

    /**
     * @return Collection<int, array{
     *     relative_path: string,
     *     doc_path: string,
     *     slug: string,
     *     target_path: string,
     *     title: string,
     *     content: string,
     *     section: string
     * }>
     */
    private function discoverDocuments(string $absoluteSourcePath, string $docsVersion): Collection
    {
        return collect(File::allFiles($absoluteSourcePath))
            ->filter(fn (\SplFileInfo $file): bool => $file->getExtension() === 'mdx')
            ->map(function (\SplFileInfo $file) use ($absoluteSourcePath, $docsVersion): array {
                $relativePath = Str::of($file->getPathname())
                    ->after($absoluteSourcePath.DIRECTORY_SEPARATOR)
                    ->replace('\\', '/')
                    ->value();

                $parsedDocument = $this->parseMdxDocument(File::get($file->getPathname()));
                $docPath = '/'.$docsVersion.'/'.trim(Str::before($relativePath, '.mdx'), '/');
                $docPath = Str::replaceEnd('/index', '', $docPath);

                return [
                    'relative_path' => $relativePath,
                    'doc_path' => $docPath,
                    'slug' => $this->postSlugFromRelativePath($relativePath),
                    'target_path' => $this->targetPathFromRelativePath($relativePath),
                    'title' => $this->titleFromFrontmatter($parsedDocument['frontmatter'], $relativePath),
                    'content' => $parsedDocument['content'],
                    'section' => Str::before($relativePath, '/'),
                ];
            })
            ->sort(function (array $left, array $right): int {
                $leftSection = $this->sectionOrder($left['section']);
                $rightSection = $this->sectionOrder($right['section']);

                if ($leftSection !== $rightSection) {
                    return $leftSection <=> $rightSection;
                }

                $leftPost = $this->sectionPostOrderIndex($left['section'], $left['slug']);
                $rightPost = $this->sectionPostOrderIndex($right['section'], $right['slug']);

                if ($leftPost !== $rightPost) {
                    return $leftPost <=> $rightPost;
                }

                return $left['relative_path'] <=> $right['relative_path'];
            })
            ->values();
    }

    private function postSlugFromRelativePath(string $relativePath): string
    {
        return (string) Str::of($relativePath)
            ->after('/')
            ->replaceLast('.mdx', '')
            ->value();
    }

    private function targetPathFromRelativePath(string $relativePath): string
    {
        $section = Str::before($relativePath, '/');
        $slug = $this->postSlugFromRelativePath($relativePath);

        return trim($section.'/'.$slug, '/');
    }

    private function isIndexDocument(string $relativePath): bool
    {
        return Str::endsWith($relativePath, '/index.mdx');
    }

    private function sectionOrder(string $section): int
    {
        $sections = array_keys(self::SECTION_DEFINITIONS);
        $index = array_search($section, $sections, true);

        return $index !== false ? $index : 99;
    }

    /**
     * @param  array<string, mixed>  $frontmatter
     */
    private function titleFromFrontmatter(array $frontmatter, string $relativePath): string
    {
        $title = $frontmatter['title'] ?? null;

        if (is_string($title) && $title !== '') {
            return $title;
        }

        return (string) Str::of($this->postSlugFromRelativePath($relativePath))
            ->replace('-', ' ')
            ->title();
    }

    /**
     * @return array{frontmatter: array<string, mixed>, content: string}
     */
    private function parseMdxDocument(string $contents): array
    {
        if (! preg_match('/\A---\R(?<frontmatter>.*?)\R---\R?(?<content>.*)\z/s', $contents, $matches)) {
            return [
                'frontmatter' => [],
                'content' => trim($contents),
            ];
        }

        try {
            $frontmatter = Yaml::parse($matches['frontmatter']);
        } catch (ParseException) {
            $frontmatter = [];
        }

        return [
            'frontmatter' => is_array($frontmatter) ? $frontmatter : [],
            'content' => ltrim($matches['content']),
        ];
    }

    /**
     * @param  array<string, string>  $pathMap
     */
    private function rewriteInternalLinks(
        string $markdown,
        string $namespaceSlug,
        string $docsVersion,
        array $pathMap,
    ): string {
        $quotedDocsVersion = preg_quote($docsVersion, '/');

        $markdown = preg_replace_callback(
            '/(\\]\\()(?<path>\\/'.$quotedDocsVersion.'\\/[^)#\\s]+)(?<hash>#[^)]+)?(\\))/',
            function (array $matches) use ($namespaceSlug, $pathMap): string {
                $rewritten = $this->rewritePath(
                    path: $matches['path'],
                    namespaceSlug: $namespaceSlug,
                    pathMap: $pathMap,
                );

                return $matches[1].$rewritten.($matches['hash'] ?? '').')';
            },
            $markdown,
        ) ?? $markdown;

        return preg_replace_callback(
            '/(href=["\'])(?<path>\/'.$quotedDocsVersion.'\/[^"#\']+)(?<hash>#[^"\']+)?(["\'])/',
            function (array $matches) use ($namespaceSlug, $pathMap): string {
                $rewritten = $this->rewritePath(
                    path: $matches['path'],
                    namespaceSlug: $namespaceSlug,
                    pathMap: $pathMap,
                );

                return $matches[1].$rewritten.($matches['hash'] ?? '').$matches[4];
            },
            $markdown,
        ) ?? $markdown;
    }

    /**
     * @param  array<string, string>  $pathMap
     */
    private function rewritePath(string $path, string $namespaceSlug, array $pathMap): string
    {
        $targetPath = $pathMap[$path] ?? null;

        if (! is_string($targetPath)) {
            return $path;
        }

        return route('posts.path', ['path' => $namespaceSlug.'/'.$targetPath], false);
    }

    private function sectionName(string $section): string
    {
        return self::SECTION_DEFINITIONS[$section]['name']
            ?? (string) Str::of($section)->replace('-', ' ')->title();
    }

    /**
     * @param  Collection<int, PostNamespace>  $sectionNamespaces
     * @return array<int, string>
     */
    private function sectionNamespaceOrder(Collection $sectionNamespaces): array
    {
        $configured = collect(array_keys(self::SECTION_DEFINITIONS))
            ->filter(fn (string $section) => $sectionNamespaces->has($section));

        $remaining = $sectionNamespaces->keys()
            ->reject(fn (string $section) => $configured->contains($section))
            ->sort()
            ->values();

        return $configured->concat($remaining)->values()->all();
    }

    /**
     * @param  Collection<int, array{slug: string}>  $sectionDocuments
     * @return array<int, string>
     */
    private function sectionPostOrder(string $section, Collection $sectionDocuments): array
    {
        $availableSlugs = $sectionDocuments->pluck('slug');
        $configured = collect(self::SECTION_DEFINITIONS[$section]['posts'] ?? [])
            ->filter(fn (string $slug) => $availableSlugs->contains($slug));

        $remaining = $availableSlugs
            ->reject(fn (string $slug) => $configured->contains($slug))
            ->sort()
            ->values();

        return $configured->concat($remaining)->values()->all();
    }

    private function sectionPostOrderIndex(string $section, string $slug): int
    {
        $order = self::SECTION_DEFINITIONS[$section]['posts'] ?? [];
        $index = array_search($slug, $order, true);

        return $index !== false ? $index : PHP_INT_MAX;
    }
}
