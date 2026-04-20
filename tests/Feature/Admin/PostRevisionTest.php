<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\PostRevision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guests are redirected from the revisions page', function () {
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->recycle($namespace)->create();

    $this->get(route('admin.posts.revisions', [$namespace, $post->slug]))
        ->assertRedirect(route('login'));
});

test('authenticated users can view the revisions page', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->recycle($namespace)->create();

    $this->actingAs($user)
        ->get(route('admin.posts.revisions', [$namespace, $post->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/revisions')
            ->has('revisions', 1)
            ->where('revisions.0.is_current', true)
        );
});

test('revisions page includes the current post and historical revisions', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->recycle($namespace)->create([
        'title' => 'Current Title',
        'content' => 'Current content.',
        'updated_at' => now(),
    ]);

    PostRevision::factory()->create([
        'post_id' => $post->id,
        'user_id' => $user->id,
        'title' => 'First draft',
        'content' => 'First content.',
        'created_at' => now()->subHours(2),
    ]);

    PostRevision::factory()->create([
        'post_id' => $post->id,
        'user_id' => $user->id,
        'title' => 'Second draft',
        'content' => 'Second content.',
        'created_at' => now()->subHour(),
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.revisions', [$namespace, $post->slug]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/revisions')
            ->has('revisions', 3)
            ->where('revisions.0.is_current', true)
            ->where('revisions.0.title', 'Current Title')
            ->where('revisions.1.title', 'Second draft')
            ->where('revisions.1.user.name', $user->name)
            ->where('revisions.2.title', 'First draft')
        );
});

test('updating a post creates a revision when content changes', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->recycle($namespace)->create([
        'title' => 'Original Title',
        'content' => 'Original content.',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post->slug]), [
            'title' => 'Updated Title',
            'content' => 'Updated content.',
            'slug' => $post->slug,
            'is_draft' => false,
            'published_at' => $post->published_at,
        ])
        ->assertRedirect();

    expect($post->revisions()->count())->toBe(1);

    $revision = $post->revisions()->first();
    expect($revision->title)->toBe('Original Title')
        ->and($revision->content)->toBe('Original content.')
        ->and($revision->user_id)->toBe($user->id);
});

test('updating a post without changes does not create a revision', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->recycle($namespace)->create([
        'title' => 'Same Title',
        'content' => 'Same content.',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post->slug]), [
            'title' => 'Same Title',
            'content' => 'Same content.',
            'slug' => $post->slug,
            'is_draft' => false,
            'published_at' => $post->published_at,
        ])
        ->assertRedirect();

    expect($post->revisions()->count())->toBe(0);
});

test('restoring a revision saves current content as a revision and applies old content', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->recycle($namespace)->create([
        'title' => 'Current Title',
        'content' => 'Current content.',
    ]);
    $revision = PostRevision::factory()->create([
        'post_id' => $post->id,
        'user_id' => $user->id,
        'title' => 'Old Title',
        'content' => 'Old content.',
    ]);

    $this->actingAs($user)
        ->post(route('admin.posts.revisions.restore', [$namespace, $post->slug, $revision]))
        ->assertRedirect(route('admin.posts.revisions', [$namespace, $post->slug]));

    $post->refresh();
    expect($post->title)->toBe('Old Title')
        ->and($post->content)->toBe('Old content.')
        ->and($post->revisions()->count())->toBe(2);
});

test('restoring a revision from another post returns 404', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->recycle($namespace)->create();
    $otherPost = Post::factory()->recycle($namespace)->create();
    $revision = PostRevision::factory()->create(['post_id' => $otherPost->id]);

    $this->actingAs($user)
        ->post(route('admin.posts.revisions.restore', [$namespace, $post->slug, $revision]))
        ->assertNotFound();
});
