<?php

use App\Ai\Agents\ThinkstreamStructureAgent;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\ThinkstreamPage;
use App\Models\Thought;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('thinkstream refine for scrap sends the currently selected thoughts', function () {
    config()->set('thinkstream.ai.enabled', true);

    ThinkstreamStructureAgent::fake([
        [
            'title' => 'Selected Summary',
            'content' => "# Selected Summary\n\nOnly the selected thought was used.",
        ],
    ]);

    $user = User::factory()->create([
        'email' => 'thinkstream-ai@example.com',
    ]);

    PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $pageModel = ThinkstreamPage::factory()->for($user)->create([
        'title' => 'Canvas',
    ]);

    Thought::factory()->for($user)->for($pageModel, 'page')->create([
        'content' => 'First thought should stay out of the refine request.',
        'created_at' => now()->subMinutes(6),
    ]);

    $selectedThought = Thought::factory()->for($user)->for($pageModel, 'page')->create([
        'content' => 'Second thought should be included in the refine request.',
        'created_at' => now()->subMinutes(5),
    ]);

    $this->actingAs($user);

    $page = visit(route('admin.thinkstream.show', $pageModel, absolute: false))
        ->resize(1440, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->click('[data-test="thinkstream-select-thoughts-button"]')
        ->click("[data-test=\"thinkstream-thought-card-{$selectedThought->id}\"]")
        ->click('[data-test="thinkstream-refine-scrap-button"]')
        ->wait(0.5)
        ->assertSee('Selected Summary')
        ->assertSee('Only the selected thought was used.')
        ->click('[data-test="thinkstream-save-scrap-button"]')
        ->wait(0.5)
        ->assertPresent('[data-test="thinkstream-view-scrap-link"]')
        ->assertSee('View in Scrap')
        ->assertNoJavaScriptErrors();

    ThinkstreamStructureAgent::assertPrompted(
        fn ($prompt) => str_contains($prompt->prompt, 'Second thought should be included in the refine request.')
            && ! str_contains($prompt->prompt, 'First thought should stay out of the refine request.'),
    );

    $post = Post::first();

    expect($post)->not->toBeNull();
    expect($post->title)->toBe('Selected Summary');
    expect($post->content)->toBe('Only the selected thought was used.');
    expect($post->namespace->slug)->toBe('scrap');
    expect(ThinkstreamPage::find($pageModel->id))->not->toBeNull();
});
