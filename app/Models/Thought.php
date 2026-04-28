<?php

namespace App\Models;

use Database\Factories\ThoughtFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Thought extends Model
{
    /** @use HasFactory<ThoughtFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'page_id', 'content'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(ThinkstreamPage::class, 'page_id');
    }
}
