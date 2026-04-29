<?php

use App\Models\ThinkstreamPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;

uses(RefreshDatabase::class);

beforeEach(function () {
    File::deleteDirectory(storage_path('app/private/thinkstream-backups'));
});

afterEach(function () {
    File::deleteDirectory(storage_path('app/private/thinkstream-backups'));
});

test('saved thinkstream restore closes the dialog after success', function () {
    $user = User::factory()->create([
        'email' => 'thinkstream-browser@example.com',
    ]);

    ThinkstreamPage::factory()->for($user)->create([
        'title' => 'Original Canvas',
    ]);

    $this->actingAs($user)->post(route('admin.thinkstream.backup'));

    $this->actingAs($user);

    $page = visit(route('admin.thinkstream.index', absolute: false))->resize(1440, 900);

    $page
        ->assertNoJavaScriptErrors()
        ->assertPresent('[data-test="thinkstream-restore-trigger"]')
        ->click('[data-test="thinkstream-restore-trigger"]')
        ->wait(0.2)
        ->assertPresent('[data-test="thinkstream-restore-dialog"]')
        ->fill('confirmation', 'restore')
        ->click('[data-test="thinkstream-restore-submit"]')
        ->wait(0.5)
        ->assertMissing('[role="dialog"]')
        ->assertNoJavaScriptErrors();
});
