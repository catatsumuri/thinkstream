<?php

namespace App\Models;

use Database\Factories\PostNamespaceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PostNamespace extends Model
{
    /** @use HasFactory<PostNamespaceFactory> */
    use HasFactory;

    protected $table = 'namespaces';

    protected $fillable = [
        'parent_id',
        'slug',
        'full_path',
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

    /**
     * Resolve cover image URL, falling back to the nearest ancestor that has one.
     *
     * @param  Collection<int, PostNamespace>|null  $ancestors  Already-loaded ancestors (closest last), avoids extra queries.
     */
    public function resolvedCoverImageUrl(?Collection $ancestors = null): ?string
    {
        if ($this->cover_image) {
            return $this->cover_image_url;
        }

        if ($ancestors !== null) {
            foreach ($ancestors->reverse() as $ancestor) {
                if ($ancestor->cover_image) {
                    return $ancestor->cover_image_url;
                }
            }

            return null;
        }

        $current = $this->parent;
        while ($current) {
            if ($current->cover_image) {
                return $current->cover_image_url;
            }
            $current = $current->parent;
        }

        return null;
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    /**
     * Sort child namespaces according to post_order, with unordered namespaces appended last.
     *
     * @param  Collection<int, PostNamespace>  $namespaces
     * @return Collection<int, PostNamespace>
     */
    public function sortNamespaces(Collection $namespaces): Collection
    {
        $order = $this->post_order ?? [];

        if (empty($order)) {
            return $namespaces->sortBy('full_path')->values();
        }

        return $namespaces->sortBy(function (PostNamespace $namespace) use ($order): int {
            $index = array_search($namespace->slug, $order);

            return $index !== false ? $index : PHP_INT_MAX;
        })->values();
    }

    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'namespace_id');
    }

    public function deleteRecursively(): void
    {
        DB::transaction(function (): void {
            foreach ($this->children()->get() as $child) {
                $child->deleteRecursively();
            }

            $this->posts()->delete();

            if ($this->cover_image) {
                Storage::disk('public')->delete($this->cover_image);
            }

            $this->delete();
        });
    }

    /**
     * @return Collection<int, PostNamespace>
     */
    public function ancestors(): Collection
    {
        $ancestors = collect();
        $currentParent = $this->parent;

        while ($currentParent) {
            $ancestors->prepend($currentParent);
            $currentParent = $currentParent->parent;
        }

        return $ancestors;
    }
}
