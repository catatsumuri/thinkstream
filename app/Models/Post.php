<?php

namespace App\Models;

use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;

class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory, Searchable;

    protected $fillable = [
        'namespace_id',
        'title',
        'slug',
        'full_path',
        'content',
        'page_views',
        'user_id',
        'is_draft',
        'published_at',
        'reference_title',
        'reference_url',
    ];

    protected function casts(): array
    {
        return [
            'is_draft' => 'boolean',
            'page_views' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function scopePublished(Builder $query): void
    {
        $query
            ->where('is_draft', false)
            ->where('published_at', '<=', now());
    }

    public function scopeWithinNamespace(Builder $query, string $namespace): void
    {
        if ($namespace === '') {
            return;
        }

        $namespacePrefix = $namespace.'/';

        $query->whereHas('namespace', function (Builder $builder) use ($namespace, $namespacePrefix): void {
            $builder->where(function (Builder $builder) use ($namespace, $namespacePrefix): void {
                $builder
                    ->where('full_path', $namespace)
                    ->orWhereRaw('substr(full_path, 1, ?) = ?', [
                        mb_strlen($namespacePrefix),
                        $namespacePrefix,
                    ]);
            });
        });
    }

    /**
     * @return array{id: int, title: string, full_path: string, content: string, tags: string}
     */
    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'full_path' => $this->full_path,
            'content' => $this->content,
            'tags' => $this->tags->pluck('name')->implode(' '),
        ];
    }

    public function shouldBeSearchable(): bool
    {
        return ! $this->is_draft
            && $this->published_at !== null
            && $this->published_at->isPast();
    }

    /**
     * @param  Collection<int, self>  $models
     * @return Collection<int, self>
     */
    public function makeSearchableUsing(Collection $models): Collection
    {
        return $models->load('tags');
    }

    public function namespace(): BelongsTo
    {
        return $this->belongsTo(PostNamespace::class, 'namespace_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class)->orderBy('name');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(PostRevision::class);
    }
}
