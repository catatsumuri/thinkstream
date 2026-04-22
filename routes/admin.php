<?php

use App\Http\Controllers\Admin\NamespaceController;
use App\Http\Controllers\Admin\PostController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/posts')->name('index');

    Route::patch('namespaces/reorder', [NamespaceController::class, 'reorder'])->name('namespaces.reorder');
    Route::resource('namespaces', NamespaceController::class)->except(['index', 'show']);

    Route::prefix('posts')->name('posts.')->group(function () {
        Route::get('/', [PostController::class, 'index'])->name('index');
        Route::post('/restore', [PostController::class, 'uploadRestoreArchive'])->name('restore.upload');
        Route::get('/restore/{token}/stream', [PostController::class, 'streamRestoreArchive'])->name('restore.stream');
        Route::get('/{namespace}', [PostController::class, 'namespaceIndex'])->name('namespace');
        Route::get('/{namespace}/backups', [PostController::class, 'backups'])->name('backups');
        Route::post('/{namespace}/backups', [PostController::class, 'storeBackup'])->name('backups.store');
        Route::post('/{namespace}/backups/delete', [PostController::class, 'destroyManyBackups'])->name('backups.destroyMany');
        Route::get('/{namespace}/backups/{backup}', [PostController::class, 'downloadBackup'])->name('backups.download');
        Route::post('/{namespace}/backups/{backup}/restore', [PostController::class, 'restoreBackup'])->name('backups.restore');
        Route::patch('/{namespace}/reorder-posts', [PostController::class, 'reorderPosts'])->name('reorderPosts');
        Route::patch('/{namespace}/reorder-namespaces', [PostController::class, 'reorderNamespaces'])->name('reorderNamespaces');
        Route::post('/{namespace}/delete-posts', [PostController::class, 'destroyMany'])->name('destroyMany');
        Route::get('/{namespace}/create', [PostController::class, 'create'])->name('create');
        Route::post('/{namespace}/image', [PostController::class, 'uploadNamespaceImage'])->name('uploadNamespaceImage');
        Route::post('/{namespace}', [PostController::class, 'store'])->name('store');
        Route::get('/{namespace}/{post:slug}', [PostController::class, 'show'])->name('show')->scopeBindings();
        Route::get('/{namespace}/{post:slug}/edit', [PostController::class, 'edit'])->name('edit')->scopeBindings();
        Route::put('/{namespace}/{post:slug}', [PostController::class, 'update'])->name('update')->scopeBindings();
        Route::delete('/{namespace}/{post:slug}', [PostController::class, 'destroy'])->name('destroy')->scopeBindings();
        Route::get('/{namespace}/{post:slug}/revisions', [PostController::class, 'revisions'])->name('revisions')->scopeBindings();
        Route::post('/{namespace}/{post:slug}/revisions/{revision}/restore', [PostController::class, 'restore'])->name('revisions.restore')->scopeBindings();
        Route::post('/{namespace}/{post:slug}/image', [PostController::class, 'uploadImage'])->name('uploadImage')->scopeBindings();
    });
});
