<?php

namespace App\Models;

use Database\Factories\PostNamespaceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;

class PostNamespace extends Model
{
    /** @use HasFactory<PostNamespaceFactory> */
    use HasFactory;

    protected $table = 'namespaces';

    protected $fillable = [
        'slug',
        'name',
        'description',
        'cover_image',
        'is_published',
        'post_order',
    ];

    protected $appends = ['cover_image_url'];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'post_order' => 'array',
        ];
    }

    /**
     * Sort a collection of posts according to post_order, with unordered posts appended last.
     *
     * @param  Collection<int, Post>  $posts
     * @return Collection<int, Post>
     */
    public function sortPosts(Collection $posts): Collection
    {
        $order = $this->post_order ?? [];

        if (empty($order)) {
            return $posts;
        }

        return $posts->sortBy(function (Post $post) use ($order): int {
            $index = array_search($post->slug, $order);

            return $index !== false ? $index : PHP_INT_MAX;
        })->values();
    }

    public function getCoverImageUrlAttribute(): ?string
    {
        return $this->cover_image ? Storage::url($this->cover_image) : null;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'namespace_id');
    }
}
