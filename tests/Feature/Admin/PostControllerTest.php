<?php

use App\Models\Post;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests are redirected from the posts index', function () {
    $this->get(route('admin.posts.index'))->assertRedirect(route('login'));
});

test('authenticated users can view the posts index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.index'))->assertOk();
});

test('authenticated users can view a post', function () {
    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create();

    $this->actingAs($user)->get(route('admin.posts.show', $post))->assertOk();
});

test('authenticated users can view the create form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.create'))->assertOk();
});

test('authenticated users can store a post', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store'), [
            'title' => 'Hello World',
            'slug' => 'hello-world',
            'content' => '# Hello\n\nThis is a test post.',
            'published_at' => null,
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('posts', [
        'title' => 'Hello World',
        'slug' => 'hello-world',
        'user_id' => $user->id,
    ]);
});

test('storing a post requires a title', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store'), ['slug' => 'my-post', 'content' => 'Some content'])
        ->assertSessionHasErrors('title');
});

test('storing a post requires a slug', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store'), ['title' => 'My Post', 'content' => 'Some content'])
        ->assertSessionHasErrors('slug');
});

test('storing a post requires a unique slug', function () {
    $user = User::factory()->create();
    Post::factory()->for($user)->create(['slug' => 'taken-slug']);

    $this->actingAs($user)
        ->post(route('admin.posts.store'), ['title' => 'My Post', 'slug' => 'taken-slug', 'content' => 'Some content'])
        ->assertSessionHasErrors('slug');
});

test('storing a post requires content', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store'), ['title' => 'My Post', 'slug' => 'my-post'])
        ->assertSessionHasErrors('content');
});

test('authenticated users can view the edit form', function () {
    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create();

    $this->actingAs($user)->get(route('admin.posts.edit', $post))->assertOk();
});

test('authenticated users can update a post', function () {
    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create(['slug' => 'old-slug']);

    $this->actingAs($user)
        ->put(route('admin.posts.update', $post), [
            'title' => 'New Title',
            'slug' => 'new-slug',
            'content' => 'Updated content.',
            'published_at' => null,
        ])
        ->assertRedirect(route('admin.posts.index'));

    $post->refresh();

    expect($post->title)->toBe('New Title');
    expect($post->slug)->toBe('new-slug');
});

test('updating a post allows keeping the same slug', function () {
    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create(['slug' => 'my-slug']);

    $this->actingAs($user)
        ->put(route('admin.posts.update', $post), [
            'title' => 'Updated Title',
            'slug' => 'my-slug',
            'content' => 'Updated content.',
        ])
        ->assertRedirect(route('admin.posts.index'));

    expect($post->fresh()->slug)->toBe('my-slug');
});

test('authenticated users can delete a post', function () {
    $user = User::factory()->create();
    $post = Post::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('admin.posts.destroy', $post))
        ->assertRedirect(route('admin.posts.index'));

    expect($post->fresh())->toBeNull();
});
