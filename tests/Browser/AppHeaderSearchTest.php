<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('app header search submits to the work in progress results page', function () {
    $user = User::factory()->create();
    $guides = PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
        'parent_id' => null,
    ]);
    PostNamespace::factory()->create([
        'name' => 'Operations',
        'slug' => 'operations',
        'full_path' => 'operations',
        'is_published' => true,
        'parent_id' => null,
    ]);
    Post::factory()->published()->create([
        'namespace_id' => $guides->id,
        'title' => 'Markdown Syntax Guide',
        'slug' => 'index',
        'full_path' => 'guides/index',
        'content' => 'Markdown basics and examples for guide pages.',
    ]);

    $this->actingAs($user);

    $page = visit(route('dashboard', absolute: false))->resize(1440, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertNotPresent('[data-test="search-popover-panel"]')
        ->click('[data-test="app-header-search-toggle"]')
        ->assertPresent('[data-test="search-popover-panel"]')
        ->assertPresent('[data-test="search-popover-input"]')
        ->assertSee('Open a quick search window from the current page.');

    expect($page->script(<<<'JS'
        (() => {
            const input = document.querySelector('[data-test="search-popover-input"]');

            if (! input) {
                return null;
            }

            return document.activeElement === input;
        })()
    JS))->toBeTrue();

    $page
        ->type('[data-test="search-popover-input"]', 'markdown')
        ->assertValue('[data-test="search-popover-input"]', 'markdown')
        ->click('[data-test="search-popover-clear"]')
        ->assertValue('[data-test="search-popover-input"]', '')
        ->type('[data-test="search-popover-input"]', 'markdown')
        ->click('[data-test="search-popover-submit"]')
        ->assertPathIs('/search')
        ->assertQueryStringHas('q', 'markdown')
        ->assertPresent('[data-test="search-results-list"]')
        ->assertPresent('[data-test="search-result-1"]')
        ->assertValue('[data-test="search-page-input"]', 'markdown');
});
