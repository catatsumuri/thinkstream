<?php

use App\Models\ThinkstreamPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can update the title of their canvas', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create(['title' => 'Old Title']);

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.updateTitle', $page), ['title' => 'New Title'])
        ->assertOk()
        ->assertJson(['title' => 'New Title']);

    expect($page->fresh()->title)->toBe('New Title');
});

test('title update strips surrounding whitespace via TrimStrings middleware', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create(['title' => 'Old Title']);

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.updateTitle', $page), ['title' => '  Trimmed  '])
        ->assertOk()
        ->assertJson(['title' => 'Trimmed']);
});

test('title update requires a non-empty title', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create(['title' => 'Original']);

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.updateTitle', $page), ['title' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect($page->fresh()->title)->toBe('Original');
});

test('title update rejects titles over 255 characters', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.updateTitle', $page), ['title' => str_repeat('a', 256)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
});

test('guests cannot update a canvas title', function () {
    $page = ThinkstreamPage::factory()->create();

    $this->patchJson(route('admin.thinkstream.updateTitle', $page), ['title' => 'Hack'])
        ->assertUnauthorized();
});

test('users cannot update another users canvas title', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($otherUser)->create(['title' => 'Original']);

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.updateTitle', $page), ['title' => 'Hijacked'])
        ->assertForbidden();

    expect($page->fresh()->title)->toBe('Original');
});

test('updating a canvas title records the last editor', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create(['title' => 'Old Title']);

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.updateTitle', $page), ['title' => 'New Title'])
        ->assertOk();

    expect($page->fresh()->last_edited_by_user_id)->toBe($user->id);
});
