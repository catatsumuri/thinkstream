<?php

namespace App\Models;

use Database\Factories\PostNamespaceFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PostNamespace extends Model
{
    /** @use HasFactory<PostNamespaceFactory> */
    use HasFactory;

    protected $table = 'namespaces';

    protected $fillable = [
        'slug',
        'name',
        'description',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
        ];
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
