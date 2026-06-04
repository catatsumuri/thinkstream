<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// Helpers

function makeNamespace(string $slug): PostNamespace
{
    return PostNamespace::factory()->create(['slug' => $slug]);
}

function makePost(PostNamespace $namespace, string $slug, string $content): Post
{
    return Post::factory()
        ->for(User::factory())
        ->published()
        ->create([
            'namespace_id' => $namespace->id,
            'slug' => $slug,
            'title' => $slug,
            'content' => $content,
        ]);
}

// Page load

test('syntax nesting test page loads', function () {
    $ns = makeNamespace('test');
    makePost($ns, 'syntax-nesting', '## Heading');

    $this->get('/test/syntax-nesting')->assertOk();
});

// Standalone components — content is passed through to Inertia correctly

test('standalone Accordion content passes through', function () {
    $ns = makeNamespace('test');
    makePost($ns, 'p', <<<'MD'
        <Accordion title="Hello">
        Content here.
        </Accordion>
        MD);

    $this->get('/test/p')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('post.content', fn ($content) => str_contains($content, 'Accordion'))
        );
});

test('AccordionGroup with multiple Accordion items passes through', function () {
    $ns = makeNamespace('test');
    makePost($ns, 'p', <<<'MD'
        <AccordionGroup>
        <Accordion title="First">One</Accordion>
        <Accordion title="Second">Two</Accordion>
        </AccordionGroup>
        MD);

    $this->get('/test/p')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('post.content', fn ($content) => str_contains($content, 'AccordionGroup'))
        );
});

test('Steps with Step items passes through', function () {
    $ns = makeNamespace('test');
    makePost($ns, 'p', <<<'MD'
        <Steps>
        <Step title="First">One</Step>
        <Step title="Second">Two</Step>
        </Steps>
        MD);

    $this->get('/test/p')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('post.content', fn ($content) => str_contains($content, 'Steps'))
        );
});

// Known broken nesting — these tests document current (broken) behavior.
// When the nesting fix is applied, update these assertions to verify correct rendering.

test('AccordionGroup > Accordion > Steps content passes through (nesting currently broken in renderer)', function () {
    $ns = makeNamespace('test');
    makePost($ns, 'p', <<<'MD'
        <AccordionGroup>
        <Accordion title="Cloudflare">
        Intro text.

        <Steps>
        <Step title="Step one">Do this.</Step>
        <Step title="Step two">Do that.</Step>
        </Steps>
        </Accordion>
        </AccordionGroup>
        MD);

    // Page must load without error regardless of rendering correctness.
    $this->get('/test/p')->assertOk();
});

test('Steps > Step > Tabs content passes through (nesting currently broken in renderer)', function () {
    $ns = makeNamespace('test');
    makePost($ns, 'p', <<<'MD'
        <Steps>
        <Step title="Choose method">
        <Tabs>
        <Tab title="Option A">Content A.</Tab>
        <Tab title="Option B">Content B.</Tab>
        </Tabs>
        </Step>
        </Steps>
        MD);

    // Page must load without error regardless of rendering correctness.
    $this->get('/test/p')->assertOk();
});
