<?php

use App\Models\PostNamespace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('canonical home shows search next to login for guests', function () {
    PostNamespace::factory()->create([
        'name' => 'Guides',
        'slug' => 'guides',
        'full_path' => 'guides',
        'is_published' => true,
        'parent_id' => null,
    ]);

    $page = visit(route('home', absolute: false));

    $page
        ->assertSee('Search')
        ->assertSee('Login')
        ->click('Search')
        ->assertPresent('[data-test="search-popover-panel"]')
        ->assertPresent('[data-test="search-popover-input"]')
        ->assertSee('Search posts');
});
