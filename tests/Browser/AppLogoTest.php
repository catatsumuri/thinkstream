<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('login page renders the new logo image', function () {
    $page = visit(route('login', absolute: false))->resize(1280, 960);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('img[src="/logo.png"]');
});

test('dashboard renders the new logo image for authenticated users', function () {
    $user = User::factory()->create();

    $this->actingAs($user);

    $page = visit(route('dashboard', absolute: false))->resize(1440, 960);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('img[src="/logo.png"]');
});
