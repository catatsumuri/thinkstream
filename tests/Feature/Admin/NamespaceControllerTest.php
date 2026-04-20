<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use App\Support\ReservedContentPath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('authenticated users can view the create form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.namespaces.create'))->assertOk();
});

test('create form accepts a parent namespace query', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
    ]);

    $this->actingAs($user)
        ->get(route('admin.namespaces.create', ['parent' => $parent->id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('parentNamespace.id', $parent->id)
            ->where('parentNamespace.name', 'Guides')
            ->where('parentNamespace.full_path', 'guides')
        );
});

test('guests are redirected from the create form', function () {
    $this->get(route('admin.namespaces.create'))->assertRedirect(route('login'));
});

test('authenticated users can store a namespace', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'slug' => 'guides',
            'name' => 'Guides',
            'description' => 'Step-by-step writing guides.',
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', [
        'slug' => 'guides',
        'name' => 'Guides',
        'description' => 'Step-by-step writing guides.',
    ]);
});

test('storing a namespace accepts a valid parent namespace', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create(['slug' => 'parent']);

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'parent_id' => $parent->id,
            'slug' => 'child',
            'name' => 'Child',
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', [
        'slug' => 'child',
        'parent_id' => $parent->id,
    ]);
});

test('storing a namespace rejects an unknown parent namespace', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'parent_id' => 999999,
            'slug' => 'child',
            'name' => 'Child',
        ])
        ->assertSessionHasErrors('parent_id');
});

test('storing a namespace rejects reserved slugs', function (string $slug) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), ['slug' => $slug, 'name' => ucfirst($slug)])
        ->assertSessionHasErrors('slug');
})->with(fn (): array => array_combine(
    ReservedContentPath::ROOT_SEGMENTS,
    ReservedContentPath::ROOT_SEGMENTS,
));

test('storing a child namespace allows reserved slugs', function (string $slug) {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create(['slug' => 'guides']);

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'parent_id' => $parent->id,
            'slug' => $slug,
            'name' => ucfirst($slug),
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', [
        'parent_id' => $parent->id,
        'slug' => $slug,
    ]);
})->with(fn (): array => array_combine(
    ReservedContentPath::ROOT_SEGMENTS,
    ReservedContentPath::ROOT_SEGMENTS,
));

test('updating a namespace rejects reserved slugs', function (string $slug) {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guides']);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), ['slug' => $slug, 'name' => ucfirst($slug)])
        ->assertSessionHasErrors('slug');
})->with(fn (): array => array_combine(
    ReservedContentPath::ROOT_SEGMENTS,
    ReservedContentPath::ROOT_SEGMENTS,
));

test('updating a child namespace allows reserved slugs', function (string $slug) {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create(['slug' => 'guides']);
    $namespace = PostNamespace::factory()->create([
        'parent_id' => $parent->id,
        'slug' => 'child',
    ]);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'parent_id' => $parent->id,
            'slug' => $slug,
            'name' => ucfirst($slug),
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', [
        'id' => $namespace->id,
        'parent_id' => $parent->id,
        'slug' => $slug,
    ]);
})->with(fn (): array => array_combine(
    ReservedContentPath::ROOT_SEGMENTS,
    ReservedContentPath::ROOT_SEGMENTS,
));

test('storing a root namespace requires a unique slug', function () {
    $user = User::factory()->create();
    PostNamespace::factory()->create(['slug' => 'taken']);

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), ['slug' => 'taken', 'name' => 'Taken'])
        ->assertSessionHasErrors('slug');
});

test('storing a namespace allows the same slug under a different parent', function () {
    $user = User::factory()->create();
    $parentA = PostNamespace::factory()->create(['slug' => 'parent-a']);
    $parentB = PostNamespace::factory()->create(['slug' => 'parent-b']);

    PostNamespace::factory()->create([
        'parent_id' => $parentA->id,
        'slug' => 'shared',
    ]);

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'parent_id' => $parentB->id,
            'slug' => 'shared',
            'name' => 'Shared',
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', [
        'parent_id' => $parentB->id,
        'slug' => 'shared',
    ]);
});

test('storing a namespace rejects a slug used by a page in the same parent namespace', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create(['slug' => 'guide']);
    Post::factory()->for($user)->create([
        'namespace_id' => $parent->id,
        'slug' => 'markdown',
    ]);

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'parent_id' => $parent->id,
            'slug' => 'markdown',
            'name' => 'Markdown',
        ])
        ->assertSessionHasErrors('slug');
});

test('storing a namespace requires a slug', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), ['name' => 'Guides'])
        ->assertSessionHasErrors('slug');
});

test('storing a namespace requires a name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), ['slug' => 'guides'])
        ->assertSessionHasErrors('name');
});

test('authenticated users can view the edit form', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)->get(route('admin.namespaces.edit', $namespace))->assertOk();
});

test('authenticated users can update a namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'old-slug',
        'name' => 'Old Name',
        'description' => 'Old description',
    ]);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'slug' => 'new-slug',
            'name' => 'New Name',
            'description' => 'Updated description',
        ])
        ->assertRedirect(route('admin.posts.index'));

    expect($namespace->fresh()->slug)->toBe('new-slug');
    expect($namespace->fresh()->name)->toBe('New Name');
    expect($namespace->fresh()->description)->toBe('Updated description');
});

test('updating a namespace redirects back to the updated canonical section page', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create([
        'slug' => 'guides',
        'full_path' => 'guides',
    ]);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'slug' => 'manuals',
            'name' => 'Manuals',
            'description' => 'Updated description',
            'return_to' => '/guides',
        ])
        ->assertRedirect('/manuals');

    expect($namespace->fresh()->slug)->toBe('manuals');
    expect($namespace->fresh()->full_path)->toBe('manuals');
});

test('updating a namespace ignores unsafe return paths', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guides']);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'slug' => 'guides',
            'name' => 'Guides',
            'return_to' => 'https://example.com/phish',
        ])
        ->assertRedirect(route('admin.posts.index'));
});

test('updating a namespace allows keeping the same slug', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'my-ns']);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'slug' => 'my-ns',
            'name' => 'Updated Name',
        ])
        ->assertRedirect(route('admin.posts.index'));

    expect($namespace->fresh()->slug)->toBe('my-ns');
});

test('updating a namespace accepts a valid parent namespace', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create(['slug' => 'parent']);
    $namespace = PostNamespace::factory()->create(['slug' => 'child']);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'parent_id' => $parent->id,
            'slug' => $namespace->slug,
            'name' => $namespace->name,
        ])
        ->assertRedirect(route('admin.posts.index'));

    expect($namespace->fresh()->parent_id)->toBe($parent->id);
    expect($namespace->fresh()->full_path)->toBe('parent/child');
});

test('updating a namespace rejects setting a descendant as its parent', function () {
    $user = User::factory()->create();
    $root = PostNamespace::factory()->create(['slug' => 'root']);
    $child = PostNamespace::factory()->create(['parent_id' => $root->id, 'slug' => 'child']);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $root), [
            'parent_id' => $child->id,
            'slug' => $root->slug,
            'name' => $root->name,
        ])
        ->assertSessionHasErrors('parent_id');
});

test('updating a namespace rejects using itself as a parent', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guides']);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'parent_id' => $namespace->id,
            'slug' => $namespace->slug,
            'name' => $namespace->name,
        ])
        ->assertSessionHasErrors('parent_id');
});

test('updating a namespace rejects a slug used by a page in the same parent namespace', function () {
    $user = User::factory()->create();
    $parent = PostNamespace::factory()->create(['slug' => 'guide']);
    $namespace = PostNamespace::factory()->create([
        'parent_id' => $parent->id,
        'slug' => 'drafts',
    ]);
    Post::factory()->for($user)->create([
        'namespace_id' => $parent->id,
        'slug' => 'markdown',
    ]);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'parent_id' => $parent->id,
            'slug' => 'markdown',
            'name' => 'Markdown',
        ])
        ->assertSessionHasErrors('slug');
});

test('authenticated users can delete a namespace', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->delete(route('admin.namespaces.destroy', $namespace))
        ->assertRedirect(route('admin.posts.index'));

    expect($namespace->fresh())->toBeNull();
});

test('storing a namespace can set is_published to false', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'slug' => 'drafts',
            'name' => 'Drafts',
            'is_published' => '0',
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', ['slug' => 'drafts', 'is_published' => false]);
});

test('storing a namespace accepts a nullable description', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'slug' => 'snippets',
            'name' => 'Snippets',
            'description' => '',
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', [
        'slug' => 'snippets',
        'description' => null,
    ]);
});

test('storing a namespace accepts checkbox values', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'slug' => 'published-guides',
            'name' => 'Published Guides',
            'is_published' => '1',
        ])
        ->assertRedirect(route('admin.posts.index'));

    $this->assertDatabaseHas('namespaces', ['slug' => 'published-guides', 'is_published' => true]);
});

test('updating a namespace can toggle is_published', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['is_published' => true]);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'slug' => $namespace->slug,
            'name' => $namespace->name,
            'is_published' => '0',
        ])
        ->assertRedirect(route('admin.posts.index'));

    expect($namespace->fresh()->is_published)->toBeFalse();
});

test('storing a namespace with a cover image saves the file', function () {
    Storage::fake('public');
    $user = User::factory()->create();
    $image = UploadedFile::fake()->image('cover.jpg', 800, 400);

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), [
            'slug' => 'guides',
            'name' => 'Guides',
            'cover_image' => $image,
        ])
        ->assertRedirect(route('admin.posts.index'));

    $namespace = PostNamespace::where('slug', 'guides')->first();
    expect($namespace->cover_image)->not->toBeNull();
    Storage::disk('public')->assertExists($namespace->cover_image);
});

test('updating a namespace with a new cover image replaces the old file', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $oldImage = UploadedFile::fake()->image('old.jpg');
    $oldPath = $oldImage->store('namespaces', 'public');
    $namespace = PostNamespace::factory()->create(['cover_image' => $oldPath]);

    $newImage = UploadedFile::fake()->image('new.jpg');

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), [
            'slug' => $namespace->slug,
            'name' => $namespace->name,
            'cover_image' => $newImage,
        ])
        ->assertRedirect(route('admin.posts.index'));

    Storage::disk('public')->assertMissing($oldPath);
    $newPath = $namespace->fresh()->cover_image;
    expect($newPath)->not->toBe($oldPath);
    Storage::disk('public')->assertExists($newPath);
});

test('deleting a namespace removes the cover image file', function () {
    Storage::fake('public');
    $user = User::factory()->create();

    $image = UploadedFile::fake()->image('cover.jpg');
    $path = $image->store('namespaces', 'public');
    $namespace = PostNamespace::factory()->create(['cover_image' => $path]);

    $this->actingAs($user)
        ->delete(route('admin.namespaces.destroy', $namespace))
        ->assertRedirect(route('admin.posts.index'));

    Storage::disk('public')->assertMissing($path);
});

test('guests cannot reorder namespaces', function () {
    $this->patch(route('admin.namespaces.reorder'), ['ids' => [1, 2]])
        ->assertRedirect(route('login'));
});

test('reorder updates sort_order on namespaces', function () {
    $user = User::factory()->create();
    $a = PostNamespace::factory()->create();
    $b = PostNamespace::factory()->create();
    $c = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->patch(route('admin.namespaces.reorder'), ['ids' => [$c->id, $a->id, $b->id]])
        ->assertRedirect();

    expect($c->fresh()->sort_order)->toBe(0);
    expect($a->fresh()->sort_order)->toBe(1);
    expect($b->fresh()->sort_order)->toBe(2);
});

test('reorder validates ids are required', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patchJson(route('admin.namespaces.reorder'), [])
        ->assertUnprocessable();
});

test('reorder validates namespace ids are distinct and existing', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();

    $this->actingAs($user)
        ->patchJson(route('admin.namespaces.reorder'), ['ids' => [$namespace->id, $namespace->id, 999999]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['ids.1', 'ids.2']);
});
