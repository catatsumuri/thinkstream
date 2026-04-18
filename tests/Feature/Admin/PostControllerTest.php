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

test('posts index only shows root namespaces with children nested', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create(['name' => 'Root', 'parent_id' => null]);
    $child = PostNamespace::factory()->create(['name' => 'Child', 'parent_id' => $root->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.index'))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/index')
            ->has('namespaces', 1)
            ->where('namespaces.0.id', $root->id)
            ->has('namespaces.0.children', 1)
            ->where('namespaces.0.children.0.id', $child->id)
        );
});

test('posts index defaults to namespace sort order', function () {
    $user = User::factory()->create();
    $first = PostNamespace::factory()->create(['name' => 'Beta', 'sort_order' => 1]);
    $second = PostNamespace::factory()->create(['name' => 'Alpha', 'sort_order' => 0]);
    $last = PostNamespace::factory()->create(['name' => 'Gamma', 'sort_order' => null]);

    $this->actingAs($user)
        ->get(route('admin.posts.index'))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/index')
            ->has('sort', fn ($sort) => $sort
                ->where('column', 'sort_order')
                ->where('direction', 'asc')
            )
            ->where('namespaces.0.id', $second->id)
            ->where('namespaces.1.id', $first->id)
            ->where('namespaces.2.id', $last->id)
        );
});

test('posts index uses url sort params when provided', function () {
    $user = User::factory()->create();
    $topNamespace = PostNamespace::factory()->create();
    $bottomNamespace = PostNamespace::factory()->create();
    Post::factory()->for($user)->create(['namespace_id' => $topNamespace->id]);
    Post::factory()->for($user)->create(['namespace_id' => $topNamespace->id]);
    Post::factory()->for($user)->create(['namespace_id' => $bottomNamespace->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.index', ['sort' => 'posts_count', 'dir' => 'desc']))
        ->assertInertia(fn ($page) => $page
            ->has('sort', fn ($sort) => $sort
                ->where('column', 'posts_count')
                ->where('direction', 'desc')
            )
            ->where('namespaces.0.id', $topNamespace->id)
            ->where('namespaces.1.id', $bottomNamespace->id)
        );
});

test('authenticated users can view the namespace post list', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.namespace', $namespace))->assertOk();
});

test('namespace post list exposes ancestors for breadcrumb', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create(['name' => 'Guides']);
    $child = PostNamespace::factory()->create(['name' => 'Laravel', 'parent_id' => $root->id]);

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $child))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/namespace')
            ->has('ancestors', 1)
            ->where('ancestors.0.id', $root->id)
            ->where('ancestors.0.name', 'Guides')
        );
});

test('root namespace post list has empty ancestors', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $root))
        ->assertInertia(fn ($page) => $page
            ->has('ancestors', 0)
        );
});

test('namespace post list includes child namespaces', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create();
    $child = PostNamespace::factory()->create(['parent_id' => $parent->id]);
    $other = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $parent))
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/namespace')
            ->has('children', 1)
            ->where('children.0.id', $child->id)
        );
});

test('namespace post list defaults to latest posts when no custom order exists', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $olderPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'created_at' => now()->subDay(),
    ]);
    $newerPost = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'created_at' => now(),
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.namespace', $namespace))
        ->assertInertia(fn ($page) => $page
            ->where('posts.0.id', $newerPost->id)
            ->where('posts.1.id', $olderPost->id)
        );
});

test('authenticated users can view the create form', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)->get(route('admin.posts.create', $namespace))->assertOk();
});

test('create form exposes a slug prefix for nested namespaces', function () {
    $user = User::factory()->create();
    $parentNamespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);
    $namespace = PostNamespace::factory()->create([
        'parent_id' => $parentNamespace->id,
        'slug' => 'laravel',
        'full_path' => 'guides/laravel',
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.create', $namespace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/create')
            ->where('namespace.id', $namespace->id)
            ->where('slugPrefix', 'guides/laravel/')
        );
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
        ->assertSessionHasNoErrors()
        ->assertSessionHas('inertia.flash_data.toast', [
            'type' => 'success',
            'message' => 'Post created.',
        ])
        ->assertRedirect(route('admin.posts.show', [$namespace, 'hello-world']));

    $this->assertDatabaseHas('posts', [
        'namespace_id' => $namespace->id,
        'title' => 'Hello World',
        'slug' => 'hello-world',
        'user_id' => $user->id,
    ]);

    expect(Post::query()->where('slug', 'hello-world')->value('published_at'))->not->toBeNull();
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
        ->assertRedirect(route('admin.posts.show', [$namespaceB, 'shared-slug']));
});

test('storing a post rejects a slug used by a child namespace in the same namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guide']);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'markdown',
    ]);

    $this->actingAs($user)
        ->post(route('admin.posts.store', $namespace), [
            'title' => 'Markdown',
            'slug' => 'markdown',
            'content' => 'Some content',
        ])
        ->assertSessionHasErrors('slug');
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

test('authenticated users can view a post details page', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'title' => 'Release Notes',
        'slug' => 'release-notes',
        'is_draft' => false,
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$namespace, $post]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/posts/show')
            ->where('namespace.id', $namespace->id)
            ->where('post.id', $post->id)
            ->where('post.slug', 'release-notes')
            ->where('post.title', 'Release Notes')
        );
});

test('post details are scoped to their namespace', function () {
    $user = User::factory()->create();
    $correctNamespace = PostNamespace::factory()->create();
    $wrongNamespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $correctNamespace->id,
    ]);

    $this->actingAs($user)
        ->get(route('admin.posts.show', [$wrongNamespace, $post]))
        ->assertNotFound();
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
        ->assertSessionHasNoErrors()
        ->assertSessionHas('inertia.flash_data.toast', [
            'type' => 'success',
            'message' => 'Post saved.',
        ])
        ->assertRedirect(route('admin.posts.show', [$namespace, 'new-slug']));

    $post->refresh();
    expect($post->title)->toBe('New Title');
    expect($post->slug)->toBe('new-slug');
    expect($post->published_at)->not->toBeNull();
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
        ->assertRedirect(route('admin.posts.show', [$namespace, 'my-slug']));

    expect($post->fresh()->slug)->toBe('my-slug');
});

test('updating a post rejects a slug used by a child namespace in the same namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guide']);
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
        'slug' => 'draft',
    ]);
    PostNamespace::factory()->create([
        'parent_id' => $namespace->id,
        'slug' => 'markdown',
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', [$namespace, $post]), [
            'title' => 'Markdown',
            'slug' => 'markdown',
            'content' => 'Updated content.',
        ])
        ->assertSessionHasErrors('slug');
});

test('authenticated users can delete a post', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create(['namespace_id' => $namespace->id]);

    $this->actingAs($user)
        ->delete(route('admin.posts.destroy', [$namespace, $post]))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('inertia.flash_data.toast', [
            'type' => 'success',
            'message' => 'Post deleted.',
        ])
        ->assertRedirect(route('admin.posts.namespace', $namespace));

    expect($post->fresh())->toBeNull();
});
