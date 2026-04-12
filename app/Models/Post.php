<?php

namespace App\Models;

use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory;

    protected $fillable = [
        'namespace_id',
        'title',
        'slug',
        'content',
        'user_id',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function namespace(): BelongsTo
    {
        return $this->belongsTo(PostNamespace::class, 'namespace_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
