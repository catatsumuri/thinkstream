<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

describe('private mode disabled', function () {
    beforeEach(fn () => config(['thinkstream.private_mode' => false]));

    test('unauthenticated user can access homepage', function () {
        $this->get(route('home'))->assertSuccessful();
    });

    test('unauthenticated user can access post path', function () {
        $namespace = PostNamespace::factory()->create(['is_published' => true]);
        $post = Post::factory()->for($namespace, 'namespace')->published()->create();

        $this->get(route('posts.path', ['path' => $post->full_path]))->assertSuccessful();
    });

    test('unauthenticated user can access images', function () {
        Storage::fake('public');
        Storage::disk('public')->put('test.png', 'fake-image');

        $this->get(route('images.show', ['path' => 'test.png']))->assertSuccessful();
    });
});

describe('private mode enabled', function () {
    beforeEach(fn () => config(['thinkstream.private_mode' => true]));

    test('unauthenticated user is redirected to login from homepage', function () {
        $this->get(route('home'))->assertRedirect(route('login'));
    });

    test('unauthenticated user is redirected to login from post path', function () {
        $namespace = PostNamespace::factory()->create(['is_published' => true]);
        $post = Post::factory()->for($namespace, 'namespace')->published()->create();

        $this->get(route('posts.path', ['path' => $post->full_path]))->assertRedirect(route('login'));
    });

    test('unauthenticated user is redirected to login from images', function () {
        Storage::fake('public');
        Storage::disk('public')->put('test.png', 'fake-image');

        $this->get(route('images.show', ['path' => 'test.png']))->assertRedirect(route('login'));
    });

    test('authenticated user can access homepage', function () {
        $this->actingAs(User::factory()->create())
            ->get(route('home'))
            ->assertSuccessful();
    });

    test('authenticated user can access post path', function () {
        $namespace = PostNamespace::factory()->create(['is_published' => true]);
        $post = Post::factory()->for($namespace, 'namespace')->published()->create();

        $this->actingAs(User::factory()->create())
            ->get(route('posts.path', ['path' => $post->full_path]))
            ->assertSuccessful();
    });

    test('authenticated user can access images', function () {
        Storage::fake('public');
        Storage::disk('public')->put('test.png', 'fake-image');

        $this->actingAs(User::factory()->create())
            ->get(route('images.show', ['path' => 'test.png']))
            ->assertSuccessful();
    });

    test('login page remains accessible and redirects back to the intended page after authentication', function () {
        $namespace = PostNamespace::factory()->create(['is_published' => true]);
        $post = Post::factory()->for($namespace, 'namespace')->published()->create();
        $user = User::factory()->create();

        $this->get(route('posts.path', ['path' => $post->full_path]))->assertRedirect(route('login'));
        $this->get(route('login'))->assertSuccessful();

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ])->assertRedirect(route('posts.path', ['path' => $post->full_path], absolute: false));
    });
});
