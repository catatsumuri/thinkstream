<?php

use App\Models\Post;
use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('top page loads', function () {
    $page = visit('/');

    $page->assertSee('ThinkStream');
});

test('published post headings expose copyable anchor links', function () {
    Post::factory()->published()->create([
        'slug' => 'anchor-post',
        'title' => 'Anchor Post',
        'content' => <<<'MARKDOWN'
# Section Title

Body

```bash
# Install dependencies
npm install
```
MARKDOWN,
    ]);

    $page = visit('/');

    $page
        ->assertSee('Anchor Post')
        ->assertSeeLink('Section Title')
        ->assertNotPresent('a[href="#anchor-post-install-dependencies"]')
        ->assertPresent('[data-test="heading-anchor-anchor-post-section-title"]')
        ->assertAttribute(
            '[data-test="heading-anchor-anchor-post-section-title"]',
            'href',
            '#anchor-post-section-title',
        );
});

test('post navigation toggle stays within the viewport after page scroll', function () {
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
        'is_published' => true,
    ]);

    $currentPost = Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'index',
        'title' => 'Index',
        'content' => collect(range(1, 40))
            ->map(fn (int $section): string => "## Section {$section}\n\n".str_repeat('Long body content. ', 30))
            ->implode("\n\n"),
    ]);

    Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'advanced',
        'title' => 'Advanced',
    ]);

    $page = visit(route('posts.path', ['path' => $currentPost->full_path]))->resize(1440, 1200);

    $page
        ->assertVisible('[data-test="posts-nav-close"]')
        ->script('window.scrollTo(0, document.body.scrollHeight)');

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('[data-test="posts-nav-close"]');

            if (! button) {
                return null;
            }

            const rect = button.getBoundingClientRect();

            return rect.top >= 0 && rect.bottom <= window.innerHeight;
        })()
    JS))->toBeTrue();

    $page
        ->click('Close')
        ->assertVisible('[data-test="posts-nav-open"]');

    expect($page->script(<<<'JS'
        (() => {
            const button = document.querySelector('[data-test="posts-nav-open"]');

            if (! button) {
                return null;
            }

            const rect = button.getBoundingClientRect();

            return rect.top >= 0 && rect.bottom <= window.innerHeight;
        })()
    JS))->toBeTrue();
});
