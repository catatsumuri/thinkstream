<?php

use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('authenticated users can view the create form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.namespaces.create'))->assertOk();
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

test('storing a namespace rejects reserved slugs', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), ['slug' => 'admin', 'name' => 'Admin'])
        ->assertSessionHasErrors('slug');
});

test('updating a namespace rejects reserved slugs', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create(['slug' => 'guides']);

    $this->actingAs($user)
        ->put(route('admin.namespaces.update', $namespace), ['slug' => 'admin', 'name' => 'Admin'])
        ->assertSessionHasErrors('slug');
});

test('storing a namespace requires a unique slug', function () {
    $user = User::factory()->create();
    PostNamespace::factory()->create(['slug' => 'taken']);

    $this->actingAs($user)
        ->post(route('admin.namespaces.store'), ['slug' => 'taken', 'name' => 'Taken'])
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
