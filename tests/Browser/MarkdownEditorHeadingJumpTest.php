<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('editor scrolls to the target heading and selects it on jump', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['is_published' => true]);

    // Build content with the heading in the middle, flanked by enough text to
    // push it out of the initial viewport and beyond the scrollable end.
    $filler = implode("\n\n", array_fill(0, 30, str_repeat('Lorem ipsum dolor sit amet. ', 8)));
    $heading = '### Target Heading';
    $content = $filler."\n\n".$heading."\n\n".$filler;

    $post = Post::factory()->for($namespace, 'namespace')->published()->create([
        'content' => $content,
    ]);

    $jumpOffset = strlen($filler) + 2; // +2 for the "\n\n" separator

    $this->actingAs($user);

    $page = visit(route('admin.posts.edit', ['namespace' => $namespace, 'post' => $post]).'?jump='.$jumpOffset);

    $page
        ->assertNoJavaScriptErrors()
        ->wait(0.3);

    // The textarea should have the heading text selected.
    $selectionStart = $page->script('document.querySelector("textarea").selectionStart');
    $selectedText = $page->script(<<<'JS'
        (() => {
            const ta = document.querySelector('textarea');
            return ta.value.slice(ta.selectionStart, ta.selectionEnd);
        })()
    JS);

    expect($selectionStart)->toBe($jumpOffset);
    expect($selectedText)->toBe($heading);

    // The textarea scroll should position the heading near the top — not at
    // zero (would mean no scroll happened) and not still at the bottom.
    $scrollTop = $page->script('document.querySelector("textarea").scrollTop');
    $scrollHeight = $page->script('document.querySelector("textarea").scrollHeight');
    $clientHeight = $page->script('document.querySelector("textarea").clientHeight');

    expect($scrollTop)->toBeGreaterThan(0);
    expect($scrollTop)->toBeLessThan($scrollHeight - $clientHeight);
});
