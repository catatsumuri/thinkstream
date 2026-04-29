<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PostReferrer extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'post_id',
        'http_referer',
        'referrer_host',
        'count',
        'last_seen_at',
    ];

    protected $attributes = [
        'count' => 0,
    ];

    protected function casts(): array
    {
        return [
            'count' => 'integer',
            'last_seen_at' => 'datetime',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public static function normalizeHost(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : $url;
    }
}
