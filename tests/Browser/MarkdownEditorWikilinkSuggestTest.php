<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('markdown editor inserts wikilink suggestions for published posts', function () {
    $user = User::factory()->create();

    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'name' => 'Guides',
    ]);

    Post::factory()->for($namespace, 'namespace')->published()->create([
        'slug' => 'laravel-scout-guide',
        'title' => 'Laravel Scout Guide',
        'content' => '# Scout',
    ]);

    Post::factory()->for($namespace, 'namespace')->draft()->create([
        'slug' => 'laravel-scout-draft',
        'title' => 'Laravel Scout Draft',
        'content' => '# Draft',
    ]);

    $post = Post::factory()->for($namespace, 'namespace')->create([
        'slug' => 'todo',
        'title' => 'Todo',
        'content' => '',
    ]);

    $this->actingAs($user);

    $page = visit(route('admin.posts.edit', [
        'namespace' => $namespace,
        'post' => $post,
    ], absolute: false))->resize(1440, 900);

    $page->assertNoJavaScriptErrors();

    $page
        ->click('textarea[name="content"]')
        ->type('textarea[name="content"]', 'See [[Scout')
        ->wait(0.7)
        ->assertPresent('[data-test="markdown-editor-wikilink-suggestions"]');

    expect($page->script(<<<'JS'
        (() => {
            return Array.from(document.querySelectorAll('[data-test="markdown-editor-wikilink-suggestion"]')).map((button) => ({
                title: button.querySelector('.font-medium')?.textContent?.trim() ?? null,
                path: button.querySelector('.text-xs')?.textContent?.trim() ?? null,
            }));
        })()
    JS))->toBe([
        [
            'title' => 'Laravel Scout Guide',
            'path' => 'guides/laravel-scout-guide',
        ],
    ]);

    $page
        ->click('[data-test="markdown-editor-wikilink-suggestion"]')
        ->wait(0.2);

    expect($page->script(<<<'JS'
        (() => {
            const textarea = document.querySelector('textarea[name="content"]');

            if (! (textarea instanceof HTMLTextAreaElement)) {
                return null;
            }

            return {
                value: textarea.value,
                selectionCollapsed: textarea.selectionStart === textarea.selectionEnd,
            };
        })()
    JS))->toBe([
        'value' => 'See [[guides/laravel-scout-guide|Laravel Scout Guide]]',
        'selectionCollapsed' => true,
    ]);
});
