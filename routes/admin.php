<?php

use App\Http\Controllers\Admin\NamespaceController;
use App\Http\Controllers\Admin\PostController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/posts')->name('index');

    Route::resource('namespaces', NamespaceController::class)->except(['index', 'show']);

    Route::prefix('posts')->name('posts.')->group(function () {
        Route::get('/', [PostController::class, 'index'])->name('index');
        Route::get('/{namespace}', [PostController::class, 'namespaceIndex'])->name('namespace');
        Route::get('/{namespace}/create', [PostController::class, 'create'])->name('create');
        Route::post('/{namespace}', [PostController::class, 'store'])->name('store');
        Route::get('/{namespace}/{post:slug}', [PostController::class, 'show'])->name('show')->scopeBindings();
        Route::get('/{namespace}/{post:slug}/edit', [PostController::class, 'edit'])->name('edit')->scopeBindings();
        Route::put('/{namespace}/{post:slug}', [PostController::class, 'update'])->name('update')->scopeBindings();
        Route::delete('/{namespace}/{post:slug}', [PostController::class, 'destroy'])->name('destroy')->scopeBindings();
    });
});
