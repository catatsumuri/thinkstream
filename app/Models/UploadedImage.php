<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UploadedImage extends Model
{
    protected $fillable = [
        'path',
        'disk',
        'exif_data',
    ];

    protected function casts(): array
    {
        return [
            'exif_data' => 'array',
        ];
    }
}
