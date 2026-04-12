<?php

use App\Models\Post;
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
