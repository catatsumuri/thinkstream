<?php

namespace App\Models;

use Database\Factories\ThinkstreamPageFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ThinkstreamPage extends Model
{
    /** @use HasFactory<ThinkstreamPageFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'title', 'last_edited_by_user_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lastEditedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_edited_by_user_id');
    }

    public function thoughts(): HasMany
    {
        return $this->hasMany(Thought::class, 'page_id');
    }
}
