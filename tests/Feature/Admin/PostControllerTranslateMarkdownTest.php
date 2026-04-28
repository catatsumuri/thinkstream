<?php

use App\Ai\Agents\TranslateSelectionAgent;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can translate selected content with AI', function () {
    TranslateSelectionAgent::fake([
        ['content' => 'こんにちは世界'],
    ]);
    config()->set('thinkstream.ai.enabled', true);
    config()->set('app.locale', 'ja');

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $response = $this->actingAs($user)
        ->postJson(route('admin.posts.translateMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => 'Hello world',
        ]);

    $response->assertOk()->assertJsonStructure(['content', 'message']);
    TranslateSelectionAgent::assertPrompted('Hello world');
});

test('translate message includes target language name', function () {
    TranslateSelectionAgent::fake([
        ['content' => 'こんにちは'],
    ]);
    config()->set('thinkstream.ai.enabled', true);
    config()->set('app.locale', 'ja');

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $response = $this->actingAs($user)
        ->postJson(route('admin.posts.translateMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => 'Hello',
        ]);

    $response->assertOk()->assertJsonPath('message', fn ($msg) => str_contains($msg, 'Japanese'));
});

test('the original post is not modified when translating', function () {
    TranslateSelectionAgent::fake([
        ['content' => '翻訳済み'],
    ]);
    config()->set('thinkstream.ai.enabled', true);
    config()->set('app.locale', 'ja');

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create(['content' => 'Original content.']);

    $this->actingAs($user)
        ->postJson(route('admin.posts.translateMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => 'Original content.',
        ]);

    expect($post->fresh()->content)->toBe('Original content.');
});

test('translate markdown returns 403 when AI is disabled', function () {
    config()->set('thinkstream.ai.enabled', false);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->actingAs($user)
        ->postJson(route('admin.posts.translateMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => 'Hello',
        ])
        ->assertForbidden();
});

test('translate markdown validates content is required', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->actingAs($user)
        ->postJson(route('admin.posts.translateMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('translate markdown validates content max length', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->actingAs($user)
        ->postJson(route('admin.posts.translateMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
            'content' => str_repeat('a', 50001),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('guests cannot translate markdown', function () {
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($namespace, 'namespace')->create();

    $this->postJson(route('admin.posts.translateMarkdown', ['namespace' => $namespace, 'post' => $post->slug]), [
        'content' => 'Hello',
    ])->assertUnauthorized();
});
