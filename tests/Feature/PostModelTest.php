<?php

use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('make searchable using eager loads tags for scout imports', function () {
    $user = User::factory()->create();
    $namespace = PostNamespace::factory()->create();
    $post = Post::factory()->for($user)->create([
        'namespace_id' => $namespace->id,
    ]);
    $post->tags()->attach(Tag::firstOrCreate(['name' => 'php']));

    $loadedPosts = $post->makeSearchableUsing(new Collection([$post->fresh()]));

    expect($loadedPosts->first())->not()->toBeNull()
        ->and($loadedPosts->first()->relationLoaded('tags'))->toBeTrue()
        ->and($loadedPosts->first()->toSearchableArray()['tags'])->toBe('php');
});
