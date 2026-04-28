<?php

use App\Ai\Agents\MarkdownStructureAgent;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can structure markdown content with AI', function () {
    MarkdownStructureAgent::fake([
        ['content' => '## Chapter 1\n\nFormatted content here.'],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create(['content' => 'Chapter 1 Unformatted content here.']);

    $response = $this->actingAs($user)
        ->postJson(route('admin.posts.structureMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => 'Chapter 1 Unformatted content here.',
        ]);

    $response->assertOk()->assertJsonStructure(['content', 'message']);

    MarkdownStructureAgent::assertPrompted('Chapter 1 Unformatted content here.');
});

test('the original post is not modified when structuring', function () {
    MarkdownStructureAgent::fake([
        ['content' => '## Formatted'],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create(['content' => 'Original content.']);

    $this->actingAs($user)
        ->postJson(route('admin.posts.structureMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => 'Original content.',
        ]);

    expect($post->fresh()->content)->toBe('Original content.');
});

test('structure markdown returns 403 when AI is disabled', function () {
    config()->set('thinkstream.ai.enabled', false);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->actingAs($user)
        ->postJson(route('admin.posts.structureMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => 'Some content.',
        ])
        ->assertForbidden();
});

test('structure markdown validates content is required', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->actingAs($user)
        ->postJson(route('admin.posts.structureMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('structure markdown validates content max length', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->actingAs($user)
        ->postJson(route('admin.posts.structureMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => str_repeat('a', 50001),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('guests cannot structure markdown', function () {
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->postJson(route('admin.posts.structureMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
        'content' => 'Some content.',
    ])->assertUnauthorized();
});
