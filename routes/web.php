<?php

use App\Http\Controllers\Api\OgpController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ImageController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\TagController;
use App\Support\ReservedContentPath;
use Illuminate\Support\Facades\Route;

Route::middleware('private.mode')->group(function () {
    Route::get('/', [PostController::class, 'index'])->name('home');
    Route::get('search', SearchController::class)->name('search');
    Route::get('tags/{tag}', [TagController::class, 'show'])->name('tags.show');

    Route::get('/images/{path}', [ImageController::class, 'show'])
        ->where('path', '.+')
        ->name('images.show');

    Route::get('/{path}.md', [PostController::class, 'resolveMarkdown'])
        ->where('path', ReservedContentPath::wildcardConstraint())
        ->name('posts.path.markdown');
});

Route::get('/api/ogp', [OgpController::class, 'fetch'])
    ->middleware('throttle:60,1')
    ->name('api.ogp');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';

// Wildcard routes must remain last so admin, auth, and API endpoints take precedence.
Route::middleware('private.mode')
    ->get('/{path}', [PostController::class, 'resolve'])
    ->where('path', ReservedContentPath::wildcardConstraint())
    ->name('posts.path');
