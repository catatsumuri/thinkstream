<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests are redirected from the posts index', function () {
    $this->get(route('admin.posts.index'))->assertRedirect(route('login'));
});

test('authenticated users can view the posts index (namespace list)', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.index'))->assertOk();
});

test('authenticated users can view the namespace post list', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.namespace', $namespace))->assertOk();
});

test('authenticated users can view the create form', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.create', $namespace))->assertOk();
});

test('authenticated users can store a post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Hello World',
            'slug' => 'hello-world',
            'content' => '# Hello\n\nThis is a test post.',
            'published_at' => null,
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace));

    $this->assertDatabaseHas('posts', [
        'namespace_id' => $namespace->id,
        'title' => 'Hello World',
        'slug' => 'hello-world',
        'user_id' => $user->id,
    ]);
});

test('storing a post requires a title', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['slug' => 'my-post', 'content' => 'Some content'])
        ->assertSessionHasErrors('title');
});

test('storing a post requires a slug', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['title' => 'My Post', 'content' => 'Some content'])
        ->assertSessionHasErrors('slug');
});

test('storing a post requires a unique slug within the same namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    Post::factory()->for($user)->create(['namespace_id' => $namespace->id, 'slug' => 'taken-slug']);

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['title' => 'My Post', 'slug' => 'taken-slug', 'content' => 'Some content'])
        ->assertSessionHasErrors('slug');
});

test('the same slug is allowed in different namespaces', function () {
    $user = User::factory()->create();
    $namespaceA = PostNamespace::factory()->create();
    $namespaceB = PostNamespace::factory()->create();
    Post::factory()->for($user)->create(['namespace_id' => $namespaceA->id, 'slug' => 'shared-slug']);

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespaceB), ['title' => 'My Post', 'slug' => 'shared-slug', 'content' => 'Some content'])
        ->assertRedirect(route('admin.posts.namespace', $namespaceB));
});

test('storing a post requires content', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), ['title' => 'My Post', 'slug' => 'my-post'])
        ->assertSessionHasErrors('content');
});

test('authenticated users can view the edit form', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.edit', [$namespace, $post]))
        ->assertOk();
});

test('authenticated users can update a post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id, 'slug' => 'old-slug']);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'New Title',
            'slug' => 'new-slug',
            'content' => 'Updated content.',
            'published_at' => null,
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace));

    $post->refresh();
    expect($post->title)->toBe('New Title');
    expect($post->slug)->toBe('new-slug');
});

test('updating a post allows keeping the same slug', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id, 'slug' => 'my-slug']);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Updated Title',
            'slug' => 'my-slug',
            'content' => 'Updated content.',
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace));

    expect($post->fresh()->slug)->toBe('my-slug');
});

test('authenticated users can delete a post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);

    $this->actingAs($user)
        ->delete(route('admin.posts.destroy', [$namespace, $post]))
        ->assertRedirect(route('admin.posts.namespace', $namespace));

    expect($post->fresh())->toBeNull();
});
