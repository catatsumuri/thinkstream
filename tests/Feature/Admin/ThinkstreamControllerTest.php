<?php

use App\Ai\Agents\MarkdownStructureAgent;
use App\Ai\Agents\ThinkstreamStructureAgent;
use App\Ai\Agents\ThinkstreamTitleAgent;
use App\Ai\Agents\TranslateSelectionAgent;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\ThinkstreamPage;
use App\Models\Thought;
use App\Models\User;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Laravel\Ai\Files\Base64Document;
use Symfony\Component\Yaml\Yaml;

uses(RefreshDatabase::class);

beforeEach(function () {
    File::deleteDirectory(storage_path('app/private/thinkstream-backups'));
});

afterEach(function () {
    File::deleteDirectory(storage_path('app/private/thinkstream-backups'));
});

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

test('authenticated users can post a thought longer than ten thousand characters', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $content = implode(' ', array_fill(0, 1_100, 'Long thought'));

    $this->actingAs($user)
        ->post(route('admin.thinkstream.store', $page), ['content' => $content])
        ->assertRedirect();

    expect(Thought::first()->content)->toBe($content);
});

test('thought content is required', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.store', $page), ['content' => ''])
        ->assertSessionHasErrors('content');
});

test('thought content cannot exceed two hundred thousand characters', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.store', $page), ['content' => str_repeat('a', 200_001)])
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

test('authenticated users can update a thought longer than ten thousand characters', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();
    $content = implode(' ', array_fill(0, 700, 'Updated long thought'));

    $this->actingAs($user)
        ->patch(route('admin.thinkstream.update', [$page, $thought]), ['content' => $content])
        ->assertRedirect();

    expect($thought->fresh()->content)->toBe($content);
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

test('updated thought content cannot exceed two hundred thousand characters', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->patchJson(route('admin.thinkstream.update', [$page, $thought]), ['content' => str_repeat('a', 200_001)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('content');
});

test('updating a thought records the last editor', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->patch(route('admin.thinkstream.update', [$page, $thought]), ['content' => 'Updated'])
        ->assertRedirect();

    expect($thought->fresh()->last_edited_by_user_id)->toBe($user->id);
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

    $response
        ->assertOk()
        ->assertJson([
            'title' => 'Canvas Title Draft',
            'content' => "# Canvas Title Draft\n\nContent here.",
            'message' => 'Content structured. (cost: $0.0000)',
        ]);

    ThinkstreamStructureAgent::assertPrompted(function ($prompt) use ($page, $thoughts) {
        $thoughtsAttachment = $prompt->attachments->first();
        $guideAttachment = $prompt->attachments->last();

        return $prompt->prompt === 'Structure the attached thoughts into a coherent document.'
            && $prompt->attachments->count() === 2
            && $thoughtsAttachment instanceof Base64Document
            && $thoughtsAttachment->mimeType() === 'text/plain'
            && str_contains($thoughtsAttachment->content(), 'Canvas title: '.$page->title)
            && str_contains($thoughtsAttachment->content(), $thoughts[0]->content)
            && str_contains($thoughtsAttachment->content(), $thoughts[1]->content)
            && $guideAttachment instanceof Base64Document
            && $guideAttachment->mimeType() === 'text/markdown'
            && str_contains($guideAttachment->content(), '# Thinkstream Markdown Syntax Guide')
            && str_contains($guideAttachment->content(), 'Critical Rule: URLs Must Be Standalone');
    });
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

test('structure thoughts fails when the syntax guide cannot be read', function () {
    ThinkstreamStructureAgent::fake()->preventStrayPrompts();
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    File::partialMock()
        ->shouldReceive('get')
        ->once()
        ->with(resource_path('ai/thinkstream-syntax-guide.md'))
        ->andThrow(new FileNotFoundException('Missing syntax guide.'));

    $this->withoutExceptionHandling();

    expect(fn () => $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThoughts', $page), [
            'ids' => [$thought->id],
        ]))->toThrow(FileNotFoundException::class);
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

// StructureThought

test('authenticated users can structure a thought draft with AI', function () {
    MarkdownStructureAgent::fake([
        ['content' => "## Structured note\n\nCleaned up."],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create([
        'content' => 'Original thought.',
    ]);

    $response = $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThought', [$page, $thought]), [
            'content' => 'messy draft content',
        ]);

    $response
        ->assertOk()
        ->assertJson([
            'content' => "## Structured note\n\nCleaned up.",
            'message' => 'Content structured. (cost: $0.0000)',
        ]);

    MarkdownStructureAgent::assertPrompted('messy draft content');
    expect($thought->fresh()->content)->toBe('Original thought.');
});

test('authenticated users can structure a long thought draft with AI', function () {
    MarkdownStructureAgent::fake([
        ['content' => "## Structured note\n\nCleaned up."],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();
    $content = str_repeat('Long thought. ', 4_500);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThought', [$page, $thought]), [
            'content' => $content,
        ])
        ->assertOk()
        ->assertJsonPath('content', "## Structured note\n\nCleaned up.");
});

test('structure thought returns 403 when AI is disabled', function () {
    config()->set('thinkstream.ai.enabled', false);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThought', [$page, $thought]), [
            'content' => 'Some content.',
        ])
        ->assertForbidden();
});

test('structure thought is scoped to the current canvas', function () {
    MarkdownStructureAgent::fake([
        ['content' => 'Structured'],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page1 = ThinkstreamPage::factory()->for($user)->create();
    $page2 = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page2, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThought', [$page1, $thought]), [
            'content' => 'Some content.',
        ])
        ->assertForbidden();
});

test('structure thought validates content is required', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThought', [$page, $thought]), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('structure thought validates content max length', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.structureThought', [$page, $thought]), [
            'content' => str_repeat('a', 200001),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('guests cannot structure a thought draft', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->postJson(route('admin.thinkstream.structureThought', [$page, $thought]), [
        'content' => 'Some content.',
    ])->assertUnauthorized();
});

// TranslateThought

test('authenticated users can translate a thought draft with AI', function () {
    TranslateSelectionAgent::fake([
        ['content' => 'こんにちは世界'],
    ]);
    config()->set('thinkstream.ai.enabled', true);
    config()->set('app.locale', 'ja');

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create([
        'content' => 'Original thought.',
    ]);

    $response = $this->actingAs($user)
        ->postJson(route('admin.thinkstream.translateThought', [$page, $thought]), [
            'content' => 'Hello world',
        ]);

    $response
        ->assertOk()
        ->assertJsonPath('content', 'こんにちは世界')
        ->assertJsonPath('message', fn (string $message): bool => str_contains($message, 'Japanese'));

    TranslateSelectionAgent::assertPrompted('Hello world');
    expect($thought->fresh()->content)->toBe('Original thought.');
});

test('authenticated users can translate a long thought draft with AI', function () {
    TranslateSelectionAgent::fake([
        ['content' => 'こんにちは世界'],
    ]);
    config()->set('thinkstream.ai.enabled', true);
    config()->set('app.locale', 'ja');

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();
    $content = str_repeat('Hello world. ', 4_500);

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.translateThought', [$page, $thought]), [
            'content' => $content,
        ])
        ->assertOk()
        ->assertJsonPath('content', 'こんにちは世界');
});

test('translate thought returns 403 when AI is disabled', function () {
    config()->set('thinkstream.ai.enabled', false);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.translateThought', [$page, $thought]), [
            'content' => 'Hello',
        ])
        ->assertForbidden();
});

test('translate thought is scoped to the current canvas', function () {
    TranslateSelectionAgent::fake([
        ['content' => 'こんにちは'],
    ]);
    config()->set('thinkstream.ai.enabled', true);
    config()->set('app.locale', 'ja');

    $user = User::factory()->create();
    $page1 = ThinkstreamPage::factory()->for($user)->create();
    $page2 = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page2, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.translateThought', [$page1, $thought]), [
            'content' => 'Hello',
        ])
        ->assertForbidden();
});

test('translate thought validates content is required', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.translateThought', [$page, $thought]), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('translate thought validates content max length', function () {
    config()->set('thinkstream.ai.enabled', true);

    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.translateThought', [$page, $thought]), [
            'content' => str_repeat('a', 200001),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['content']);
});

test('guests cannot translate a thought draft', function () {
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create();
    $thought = Thought::factory()->for($user)->for($page, 'page')->create();

    $this->postJson(route('admin.thinkstream.translateThought', [$page, $thought]), [
        'content' => 'Hello',
    ])->assertUnauthorized();
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

test('refining a canvas title with AI does not overwrite the last editor', function () {
    ThinkstreamTitleAgent::fake([
        ['title' => 'AI Title'],
    ]);
    config()->set('thinkstream.ai.enabled', true);

    $editor = User::factory()->create();
    $user = User::factory()->create();
    $page = ThinkstreamPage::factory()->for($user)->create([
        'last_edited_by_user_id' => $editor->id,
    ]);
    Thought::factory()->for($user)->for($page, 'page')->create();

    $this->actingAs($user)
        ->postJson(route('admin.thinkstream.refineTitle', $page))
        ->assertOk();

    expect($page->fresh()->last_edited_by_user_id)->toBe($editor->id);
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

// Backup

test('authenticated users can create a thinkstream backup', function () {
    $user = User::factory()->create();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'My Canvas']);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup'))
        ->assertRedirect(route('admin.thinkstream.index'));

    $path = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');
    expect(file_exists($path))->toBeTrue();

    $zip = new ZipArchive;
    $zip->open($path);
    $json = json_decode($zip->getFromName('thinkstream.json'), true);
    $zip->close();

    expect($json)->toHaveCount(1);
    expect($json[0]['title'])->toBe('My Canvas');
});

test('backup only includes the authenticated users canvases', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'Mine']);
    ThinkstreamPage::factory()->for($otherUser)->create(['title' => 'Not mine']);

    $this->actingAs($user)->post(route('admin.thinkstream.backup'));

    $path = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');
    $zip = new ZipArchive;
    $zip->open($path);
    $json = json_decode($zip->getFromName('thinkstream.json'), true);
    $zip->close();

    expect($json)->toHaveCount(1);
    expect($json[0]['title'])->toBe('Mine');
});

test('backup accepts an optional description stored in yaml', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('admin.thinkstream.backup'), ['description' => 'snapshot note']);

    $path = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');
    $zip = new ZipArchive;
    $zip->open($path);
    $yaml = Yaml::parse($zip->getFromName('_backup.yaml'));
    $zip->close();

    expect($yaml['description'])->toBe('snapshot note');
});

test('backup rejects descriptions longer than two thousand characters', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup'), ['description' => str_repeat('a', 2_001)])
        ->assertSessionHasErrors('description');
});

test('latest backup is shown on the index after creating one', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('admin.thinkstream.backup'));

    $this->actingAs($user)
        ->get(route('admin.thinkstream.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('latest_backup')
            ->whereNot('latest_backup', null)
        );
});

test('authenticated users can download their latest backup', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('admin.thinkstream.backup'));

    $response = $this->actingAs($user)->get(route('admin.thinkstream.backup.download'));
    $response->assertOk();
    $response->assertHeader('Content-Type', 'application/zip');
    expect($response->headers->get('Content-Disposition'))->toContain('thinkstream-');
});

test('downloading backup returns 404 when none exists', function () {
    $user = User::factory()->create();

    $path = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');
    @unlink($path);

    $this->actingAs($user)->get(route('admin.thinkstream.backup.download'))->assertNotFound();
});

test('unauthenticated users cannot create a thinkstream backup', function () {
    $this->post(route('admin.thinkstream.backup'))->assertRedirect(route('login'));
});

// Backup Restore

test('authenticated users can restore from backup', function () {
    $user = User::factory()->create();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'Original Canvas']);
    $this->actingAs($user)->post(route('admin.thinkstream.backup'));

    // Replace data with something else
    ThinkstreamPage::where('user_id', $user->id)->delete();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'New Canvas']);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore'), ['confirmation' => 'restore'])
        ->assertRedirect(route('admin.thinkstream.index'));

    $titles = ThinkstreamPage::where('user_id', $user->id)->pluck('title');
    expect($titles)->toContain('Original Canvas');
    expect($titles)->not->toContain('New Canvas');
});

test('restore requires confirmation text', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('admin.thinkstream.backup'));

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore'), ['confirmation' => 'wrong'])
        ->assertSessionHasErrors('confirmation');
});

test('restore returns 404 when no backup exists', function () {
    $user = User::factory()->create();

    $path = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');
    @unlink($path);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore'), ['confirmation' => 'restore'])
        ->assertNotFound();
});

test('restore preserves existing canvases when the saved backup payload is invalid', function () {
    $user = User::factory()->create();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'Current Canvas']);

    $path = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');
    File::ensureDirectoryExists(dirname($path));

    $zip = new ZipArchive;
    $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->addFromString('thinkstream.json', '{invalid json');
    $zip->close();

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore'), ['confirmation' => 'restore'])
        ->assertSessionHasErrors('backup');

    expect(ThinkstreamPage::whereBelongsTo($user)->pluck('title')->all())
        ->toBe(['Current Canvas']);
});

test('unauthenticated users cannot restore a thinkstream backup', function () {
    $this->post(route('admin.thinkstream.backup.restore'))->assertRedirect(route('login'));
});

// Backup Restore Upload

test('authenticated users can restore from an uploaded zip', function () {
    $user = User::factory()->create();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'Original Canvas']);
    $this->actingAs($user)->post(route('admin.thinkstream.backup'));

    $zipPath = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');

    ThinkstreamPage::where('user_id', $user->id)->delete();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'Different Canvas']);

    $uploadedFile = new UploadedFile($zipPath, 'thinkstream.zip', 'application/zip', null, true);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore.upload'), [
            'file' => $uploadedFile,
            'confirmation' => 'restore',
        ])
        ->assertRedirect(route('admin.thinkstream.index'));

    $titles = ThinkstreamPage::where('user_id', $user->id)->pluck('title');
    expect($titles)->toContain('Original Canvas');
    expect($titles)->not->toContain('Different Canvas');
});

test('upload restore overwrites the saved backup file', function () {
    $user = User::factory()->create();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'Original']);
    $this->actingAs($user)->post(route('admin.thinkstream.backup'));
    $zipPath = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');
    $mtimeBefore = filemtime($zipPath);

    sleep(1);

    $uploadedFile = new UploadedFile($zipPath, 'thinkstream.zip', 'application/zip', null, true);
    $this->actingAs($user)->post(route('admin.thinkstream.backup.restore.upload'), [
        'file' => $uploadedFile,
        'confirmation' => 'restore',
    ]);

    clearstatcache();
    expect(filemtime($zipPath))->toBeGreaterThanOrEqual($mtimeBefore);
    expect(file_exists($zipPath))->toBeTrue();
});

test('upload restore rejects a non-thinkstream zip', function () {
    $user = User::factory()->create();

    $tempPath = tempnam(sys_get_temp_dir(), 'invalid-').'.zip';
    $zip = new ZipArchive;
    $zip->open($tempPath, ZipArchive::CREATE);
    $zip->addFromString('something-else.json', '{}');
    $zip->close();

    $uploadedFile = new UploadedFile($tempPath, 'bad.zip', 'application/zip', null, true);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore.upload'), [
            'file' => $uploadedFile,
            'confirmation' => 'restore',
        ])
        ->assertSessionHasErrors('file');

    unlink($tempPath);
});

test('upload restore rejects malformed thinkstream json without deleting current canvases', function () {
    $user = User::factory()->create();
    ThinkstreamPage::factory()->for($user)->create(['title' => 'Current Canvas']);

    $tempPath = tempnam(sys_get_temp_dir(), 'invalid-thinkstream-').'.zip';
    $zip = new ZipArchive;
    $zip->open($tempPath, ZipArchive::CREATE);
    $zip->addFromString('thinkstream.json', '{invalid json');
    $zip->close();

    $uploadedFile = new UploadedFile($tempPath, 'broken.zip', 'application/zip', null, true);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore.upload'), [
            'file' => $uploadedFile,
            'confirmation' => 'restore',
        ])
        ->assertSessionHasErrors('file');

    expect(ThinkstreamPage::whereBelongsTo($user)->pluck('title')->all())
        ->toBe(['Current Canvas']);

    unlink($tempPath);
});

test('upload restore requires confirmation text', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->post(route('admin.thinkstream.backup'));
    $zipPath = storage_path('app/private/thinkstream-backups/thinkstream-'.$user->id.'.zip');

    $uploadedFile = new UploadedFile($zipPath, 'thinkstream.zip', 'application/zip', null, true);

    $this->actingAs($user)
        ->post(route('admin.thinkstream.backup.restore.upload'), [
            'file' => $uploadedFile,
            'confirmation' => 'wrong',
        ])
        ->assertSessionHasErrors('confirmation');
});

test('unauthenticated users cannot use upload restore', function () {
    $this->post(route('admin.thinkstream.backup.restore.upload'))->assertRedirect(route('login'));
});
