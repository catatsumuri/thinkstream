<?php

use App\Models\ThinkstreamPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('authenticated users can upload an image to a thinkstream page', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $image = UploadedFile::fake()->image('photo.jpg');

    $this->actingAs($user)
        ->post(route('admin.thinkstream.uploadImage', $page), ['image' => $image])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('thoughtImageUrl', "/images/thoughts/{$page->id}/{$image->hashName()}")
        ->assertRedirect(route('admin.thinkstream.show', $page));

    Storage::disk('public')->assertExists("thoughts/{$page->id}/{$image->hashName()}");
    $this->assertDatabaseHas('uploaded_images', [
        'path' => "thoughts/{$page->id}/{$image->hashName()}",
        'disk' => 'public',
    ]);
});

test('guests cannot upload thinkstream images', function () {
    $page = ThinkstreamPage::factory()->create();

    $this->post(route('admin.thinkstream.uploadImage', $page), [])
        ->assertRedirect(route('login'));
});

test('users cannot upload images to another users thinkstream page', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($otherUser)->create();
    $image = UploadedFile::fake()->image('photo.jpg');

    $this->actingAs($user)
        ->post(route('admin.thinkstream.uploadImage', $page), ['image' => $image])
        ->assertForbidden();

    Storage::disk('public')->assertMissing("thoughts/{$page->id}/{$image->hashName()}");
});

test('thinkstream image upload rejects non-image files', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.uploadImage', $page), [
            'image' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors('image');
});

test('thinkstream image upload rejects files over 5MB', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.uploadImage', $page), [
            'image' => UploadedFile::fake()->image('large.jpg')->size(6000),
        ])
        ->assertSessionHasErrors('image');
});

test('thinkstream image upload resizes oversized images', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $image = UploadedFile::fake()->image('big.jpg', 4096, 3000);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.uploadImage', $page), ['image' => $image])
        ->assertSessionHasNoErrors();

    $path = "thoughts/{$page->id}/{$image->hashName()}";
    $contents = Storage::disk('public')->get($path);
    [$width, $height] = getimagesizefromstring($contents);

    expect(max($width, $height))->toBeLessThanOrEqual(2048);
});

test('thinkstream gif upload is stored as-is without resize', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $image = UploadedFile::fake()->image('anim.gif', 100, 100);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.uploadImage', $page), ['image' => $image])
        ->assertSessionHasNoErrors();

    Storage::disk('public')->assertExists("thoughts/{$page->id}/{$image->hashName()}");
    $this->assertDatabaseHas('uploaded_images', [
        'path' => "thoughts/{$page->id}/{$image->hashName()}",
        'disk' => 'public',
        'exif_data' => null,
    ]);
});
