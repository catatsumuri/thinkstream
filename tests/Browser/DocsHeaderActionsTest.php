<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('manage button is visible on mobile for authenticated user', function () {
    $user = User::factory()->create();
    $post = Post::factory()->published()->create();

    $this->actingAs($user);

    $page = visit(route('posts.path', ['path' => $post->full_path], absolute: false))
        ->resize(375, 812);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[aria-label="Manage"]');
});

test('manage button is visible on sm breakpoint for authenticated user', function () {
    $user = User::factory()->create();
    $post = Post::factory()->published()->create();

    $this->actingAs($user);

    $page = visit(route('posts.path', ['path' => $post->full_path], absolute: false))
        ->resize(640, 960);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[aria-label="Manage"]');
});

test('login button shown on mobile for unauthenticated user', function () {
    $post = Post::factory()->published()->create();

    $page = visit(route('posts.path', ['path' => $post->full_path], absolute: false))
        ->resize(375, 812);

    $page
        ->assertNoJavaScriptErrors()
        ->assertSee('Login');
});

test('namespace mobile nav toggle button is visible below lg breakpoint', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true]);
    Post::factory()->for($namespace, 'namespace')->published()->create();

    foreach ([375, 640, 768] as $width) {
        $page = visit(route('posts.path', ['path' => $namespace->full_path], absolute: false))
            ->resize($width, 960);

        $page
            ->assertNoJavaScriptErrors()
            ->assertPresent('[aria-label="Open navigation"]');
    }
});

test('namespace nav is hidden by default below lg and opens via sheet', function () {
    $namespace = PostNamespace::factory()->create(['is_published' => true, 'name' => 'My Namespace']);
    Post::factory()->for($namespace, 'namespace')->published()->create();

    $page = visit(route('posts.path', ['path' => $namespace->full_path], absolute: false))
        ->resize(768, 1024);

    $page
        ->assertNoJavaScriptErrors()
        ->assertNotPresent('[data-test="namespace-nav"]')
        ->click('[aria-label="Open navigation"]')
        ->assertSee('My Namespace');
});
