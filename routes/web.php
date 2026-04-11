<?php

use App\Http\Controllers\PostController;
use Illuminate\Support\Facades\Route;

Route::get('/', [PostController::class, 'index'])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';

// Wildcard routes — registered last to avoid conflicting with more specific routes
Route::get('/{namespace:slug}', [PostController::class, 'namespace'])->name('posts.namespace');
Route::get('/{namespace:slug}/{post:slug}', [PostController::class, 'show'])->name('posts.show')->scopeBindings();
