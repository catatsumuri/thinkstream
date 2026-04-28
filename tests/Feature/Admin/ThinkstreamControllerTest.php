<?php

use App\Ai\Agents\ThinkstreamStructureAgent;
use App\Ai\Agents\ThinkstreamTitleAgent;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\ThinkstreamPage;
use App\Models\Thought;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Index

test('authenticated users can view the thinkstream index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('admin.thinkstream.index'))->assertOk();
});

test('thinkstream index only lists the authenticated users canvases', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $ownPage = ThinkstreamPage::factory()->for($user)->create([
        'title' => 'My Canvas',
    ]);
    ThinkstreamPage::factory()->for($otherUser)->create([
        'title' => 'Other Canvas',
    ]);

    $this->actingAs($user)
        ->get(route('admin.thinkstream.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/thinkstream/index')
            ->has('pages', 1)
            ->where('pages.0.id', $ownPage->id)
            ->where('pages.0.title', 'My Canvas')
        );
});

test('guests are redirected from the thinkstream index', function () {
    $this->get(route('admin.thinkstream.index'))->assertRedirect(route('login'));
});

// StorePage

test('authenticated users can create a new canvas', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.storePage'))
        ->assertRedirect();

    expect(ThinkstreamPage::count())->toBe(1);
    expect(ThinkstreamPage::first()->user_id)->toBe($user->id);
    expect(ThinkstreamPage::first()->title)->toMatch('/^Canvas \d{4}-\d{2}-\d{2}/');
});

test('creating a canvas redirects to its show page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('admin.thinkstream.storePage'));

    $page = ThinkstreamPage::first();
    expect($page)->not->toBeNull();
});

// Show

test('authenticated users can view a canvas', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)->get(route('admin.thinkstream.show', $page))->assertOk();
});

test('users cannot view another users canvas', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->get(route('admin.thinkstream.show', $page))
        ->assertForbidden();
});

test('guests are redirected from the canvas show page', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->get(route('admin.thinkstream.show', $page))->assertRedirect(route('login'));
});

// DestroyPage

test('authenticated users can delete a canvas', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    Thought::factory()->count(2)->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->delete(route('admin.thinkstream.destroyPage', $page))
        ->assertRedirect(route('admin.thinkstream.index'));

    expect(ThinkstreamPage::count())->toBe(0);
    expect(Thought::count())->toBe(0);
});

test('users cannot delete another users canvas', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->delete(route('admin.thinkstream.destroyPage', $page))
        ->assertForbidden();

    expect($page->fresh())->not->toBeNull();
});

// Store

test('authenticated users can post a thought', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.store', $page), ['content' => 'Hello world'])
        ->assertRedirect();

    expect(Thought::count())->toBe(1);
    expect(Thought::first()->content)->toBe('Hello world');
    expect(Thought::first()->user_id)->toBe($user->id);
    expect(Thought::first()->page_id)->toBe($page->id);
});

test('thought content is required', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.store', $page), ['content' => ''])
        ->assertSessionHasErrors('content');
});

// Update

test('authenticated users can update a thought', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->patch(route('admin.thinkstream.update', [$page, $thought]), ['content' => 'Updated content'])
        ->assertRedirect();

    expect($thought->fresh()->content)->toBe('Updated content');
});

test('update is scoped to the current canvas', function () {
    $user = User::factory()->create();
    $page1 = ThinkstreamPage::factory()->for($user)->create();
    $page2 = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page2, 'page')->create();

    $this->actingAs($user)
        ->patch(route('admin.thinkstream.update', [$page1, $thought]), ['content' => 'Hacked'])
        ->assertForbidden();
});

test('update content is required', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.update', [$page, $thought]), ['content' => ''])
        ->assertUnprocessable();
});

// DestroyMany

test('authenticated users can bulk delete thoughts', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thoughts = Thought::factory()->count(3)->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.destroyMany', $page), ['ids' => $thoughts->pluck('id')->all()])
        ->assertRedirect();

    expect(Thought::count())->toBe(0);
});

test('bulk delete is scoped to the current canvas', function () {
    $user = User::factory()->create();
    $page1 = ThinkstreamPage::factory()->for($user)->create();
    $page2 = ThinkstreamPage::factory()->for($user)->create();
    $thoughtOnPage1 = Thought::factory()->for($user)->for($page1, 'page')->create();
    $thoughtOnPage2 = Thought::factory()->for($user)->for($page2, 'page')->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.destroyMany', $page1), [
            'ids' => [$thoughtOnPage1->id, $thoughtOnPage2->id],
        ])
        ->assertRedirect();

    expect(Thought::count())->toBe(1);
    expect(Thought::first()->id)->toBe($thoughtOnPage2->id);
});

// StructureThoughts

test('authenticated users can structure thoughts with AI', function () {
    ThinkstreamStructureAgent::fake([
        ['title' => 'Canvas Title Draft', 'content' => "# Canvas Title Draft\n\nContent here."],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thoughts = Thought::factory()->count(2)->for($user)->for($page, 'page')->create();

    $response = $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThoughts', $page), [
            'ids' => $thoughts->pluck('id')->all(),
        ]);

    $response->assertOk()->assertJsonStructure(['title', 'content', 'message']);
});

test('structure thoughts returns 403 when AI is disabled', function () {
    config()->set('thinkstream.ai.enabled', false);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thoughts = Thought::factory()->count(2)->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThoughts', $page), [
            'ids' => $thoughts->pluck('id')->all(),
        ])
        ->assertForbidden();
});

test('users cannot structure another users thoughts with AI', function () {
    ThinkstreamStructureAgent::fake([
        ['title' => 'Canvas Title Draft', 'content' => 'Content here.'],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($otherUser)->create();
    $thoughts = Thought::factory()->count(2)->for($otherUser)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThoughts', $page), [
            'ids' => $thoughts->pluck('id')->all(),
        ])
        ->assertForbidden();
});

// RefineTitle

test('authenticated users can refine a canvas title with AI', function () {
    ThinkstreamTitleAgent::fake([
        ['title' => 'Product Strategy Notes'],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create([
        'title' => 'Canvas 2026-04-29 12:00',
    ]);
    Thought::factory()->count(2)->for($user)->for($page, 'page')->create();

    $response = $this->actingAs($user)
        ->postJson(route('admin.thinkstream.refineTitle', $page));

    $response
        ->assertOk()
        ->assertJson([
            'title' => 'Product Strategy Notes',
        ]);

    $response->assertSessionHas('inertia.flash_data.toast', [
        'type' => 'success',
        'message' => 'Title refined. (cost: $0.0000)',
    ]);

    expect($page->fresh()->title)->toBe('Product Strategy Notes');
});

test('refine title returns 422 when a canvas has no thoughts', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.refineTitle', $page))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('page');
});

test('refine title returns 403 when AI is disabled', function () {
    config()->set('thinkstream.ai.enabled', false);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.refineTitle', $page))
        ->assertForbidden();
});

// SaveToScrap

test('save to scrap creates a post in the scrap namespace', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $response = $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'content' => "# My Note\n\nSome content here.",
            'delete_canvas' => false,
        ]);

    $response->assertOk()->assertJsonStructure(['url']);

    $post = Post::first();
    expect($post)->not->toBeNull();
    expect($post->title)->toBe('My Note');
    expect($post->content)->toBe('Some content here.');
    expect($post->slug)->toMatch('/^my-note-\d{8}$/');
    expect($post->namespace->slug)->toBe('scrap');
    expect($post->is_draft)->toBeTrue();
    expect($post->published_at)->toBeNull();
    expect($post->namespace->is_published)->toBeFalse();
});

test('save to scrap keeps non-title-leading content unchanged', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'title' => 'My Note',
            'content' => "## Context\n\nSome content here.",
            'delete_canvas' => false,
        ])
        ->assertOk();

    $post = Post::first();
    expect($post->title)->toBe('My Note');
    expect($post->content)->toBe("## Context\n\nSome content here.");
    expect($post->slug)->toMatch('/^my-note-\d{8}$/');
});

test('save to scrap falls back to timestamp title when no heading', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'content' => 'Just some text without a heading.',
            'delete_canvas' => false,
        ])
        ->assertOk();

    $post = Post::first();
    expect($post->title)->toMatch('/^Scrap \d{4}-\d{2}-\d{2}/');
    expect($post->slug)->toMatch('/^scrap-\d{4}-\d{2}-\d{2}-.+-\d{8}$/');
    expect($post->is_draft)->toBeTrue();
    expect($post->published_at)->toBeNull();
});

test('save to scrap appends a counter when the dated slug already exists', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $scrap = PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    Post::factory()->for($scrap, 'namespace')->create([
        'user_id' => $user->id,
        'title' => 'My Note',
        'slug' => 'my-note-'.now()->format('Ymd'),
    ]);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'title' => 'My Note',
            'content' => "## Context\n\nSome content here.",
            'delete_canvas' => false,
        ])
        ->assertOk();

    $post = Post::latest('id')->first();
    expect($post->slug)->toMatch('/^my-note-\d{8}-2$/');
});

test('save to scrap returns 403 when AI is disabled', function () {
    config()->set('thinkstream.ai.enabled', false);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'content' => 'Some content.',
            'delete_canvas' => false,
        ])
        ->assertForbidden();
});

test('save to scrap can delete the original canvas', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    Thought::factory()->count(2)->for($user)->for($page, 'page')->create();
    PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'title' => 'My Note',
            'content' => "## Context\n\nSome content here.",
            'delete_canvas' => true,
            'page_id' => $page->id,
        ])
        ->assertOk();

    expect(ThinkstreamPage::find($page->id))->toBeNull();
    expect(Thought::where('page_id', $page->id)->count())->toBe(0);
});

test('save to scrap requires page id when deleting the original canvas', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'title' => 'My Note',
            'content' => "## Context\n\nSome content here.",
            'delete_canvas' => true,
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('page_id');
});

test('users cannot delete another users canvas when saving to scrap', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($otherUser)->create();
    Thought::factory()->count(2)->for($otherUser)->for($page, 'page')->create();
    PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.saveToScrap'), [
            'title' => 'My Note',
            'content' => "## Context\n\nSome content here.",
            'delete_canvas' => true,
            'page_id' => $page->id,
        ])
        ->assertForbidden();

    expect($page->fresh())->not->toBeNull();
    expect(Post::count())->toBe(0);
});
// Namespace system protection

test('system namespaces cannot be deleted', function () {
    $user = User::factory()->create();
    $scrap = PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->delete(route('admin.namespaces.destroy', $scrap))
        ->assertForbidden();

    expect(PostNamespace::where('slug', 'scrap')->exists())->toBeTrue();
});

test('system namespaces cannot be updated', function () {
    $user = User::factory()->create();
    $scrap = PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->patch(route('admin.namespaces.update', $scrap), [
            'slug' => 'scrap',
            'name' => 'Renamed',
        ])
        ->assertForbidden();

    expect($scrap->fresh()->name)->toBe('Scrap');
});

test('system namespace is_published cannot be set to true', function () {
    $user = User::factory()->create();
    $scrap = PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);

    $this->actingAs($user)
        ->patch(route('admin.namespaces.update', $scrap), [
            'slug' => 'scrap',
            'name' => 'Scrap',
            'is_published' => true,
        ])
        ->assertForbidden();

    expect($scrap->fresh()->is_published)->toBeFalse();
});

test('posts in system namespace cannot be published via update', function () {
    $user = User::factory()->create();
    $scrap = PostNamespace::create([
        'slug' => 'scrap',
        'full_path' => 'scrap',
        'name' => 'Scrap',
        'is_system' => true,
        'is_published' => false,
    ]);
    $post = Post::factory()->for($scrap, 'namespace')->create([
        'user_id' => $user->id,
        'is_draft' => true,
        'published_at' => null,
    ]);

    $this->actingAs($user)
        ->put(route('admin.posts.update', ['namespace' => $scrap, 'post' => $post->slug]), [
            'title' => $post->title,
            'slug' => $post->slug,
            'content' => $post->content,
            'is_draft' => '0',
            'published_at' => now()->toDateTimeString(),
        ])
        ->assertRedirect();

    $post->refresh();
    expect($post->is_draft)->toBeTrue();
    expect($post->published_at)->toBeNull();
});
