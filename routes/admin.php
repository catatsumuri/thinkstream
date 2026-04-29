<?php

use App\Http\Controllers\Admin\BackupController;
use App\Http\Controllers\Admin\NamespaceController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\ThinkstreamController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->prefix('admin')->name('admin.')->group(function () {
    Route::redirect('/', '/admin/posts')->name('index');

    Route::get('thinkstream', [ThinkstreamController::class, 'index'])->name('thinkstream.index');
    Route::post('thinkstream', [ThinkstreamController::class, 'storePage'])->name('thinkstream.storePage');
    Route::post('thinkstream/save-to-scrap', [ThinkstreamController::class, 'saveToScrap'])->name('thinkstream.saveToScrap');
    Route::post('thinkstream/backup', [ThinkstreamController::class, 'backup'])->name('thinkstream.backup');
    Route::get('thinkstream/backup/download', [ThinkstreamController::class, 'backupDownload'])->name('thinkstream.backup.download');
    Route::post('thinkstream/backup/restore', [ThinkstreamController::class, 'backupRestore'])->name('thinkstream.backup.restore');
    Route::post('thinkstream/backup/restore/upload', [ThinkstreamController::class, 'backupRestoreUpload'])->name('thinkstream.backup.restore.upload');
    Route::delete('thinkstream/{page}', [ThinkstreamController::class, 'destroyPage'])->name('thinkstream.destroyPage');
    Route::get('thinkstream/{page}', [ThinkstreamController::class, 'show'])->name('thinkstream.show');
    Route::post('thinkstream/{page}/image', [ThinkstreamController::class, 'uploadImage'])->name('thinkstream.uploadImage');
    Route::post('thinkstream/{page}', [ThinkstreamController::class, 'store'])->name('thinkstream.store');
    Route::post('thinkstream/{page}/refine-title', [ThinkstreamController::class, 'refineTitle'])->name('thinkstream.refineTitle');
    Route::patch('thinkstream/{page}/thoughts/{thought}', [ThinkstreamController::class, 'update'])->name('thinkstream.update');
    Route::post('thinkstream/{page}/delete', [ThinkstreamController::class, 'destroyMany'])->name('thinkstream.destroyMany');
    Route::post('thinkstream/{page}/structure', [ThinkstreamController::class, 'structureThoughts'])->name('thinkstream.structureThoughts');

    Route::patch('namespaces/reorder', [NamespaceController::class, 'reorder'])->name('namespaces.reorder');
    Route::resource('namespaces', NamespaceController::class)->except(['index', 'show']);
    Route::post('namespaces/{namespace}/generate-cover-image', [NamespaceController::class, 'generateCoverImage'])->name('namespaces.generate-cover-image');
    Route::get('backups', [BackupController::class, 'index'])->name('backups.index');
    Route::post('backups/create', [BackupController::class, 'storeMany'])->name('backups.storeMany');
    Route::post('backups/delete', [BackupController::class, 'destroyMany'])->name('backups.destroyMany');
    Route::post('backups/restore', [BackupController::class, 'restoreMany'])->name('backups.restoreMany');
    Route::get('backups/{backup}', [BackupController::class, 'download'])->name('backups.download');
    Route::post('backups/{backup}/restore', [BackupController::class, 'restore'])->name('backups.restore');

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
        Route::post('/{namespace}/{post:slug}/move-to-namespace', [PostController::class, 'moveToNamespace'])->name('moveToNamespace')->scopeBindings();
        Route::put('/{namespace}/{post:slug}', [PostController::class, 'update'])->name('update')->scopeBindings();
        Route::delete('/{namespace}/{post:slug}', [PostController::class, 'destroy'])->name('destroy')->scopeBindings();
        Route::post('/{namespace}/{post:slug}/sync-file', [PostController::class, 'storeSyncFile'])->name('storeSyncFile')->scopeBindings();
        Route::delete('/{namespace}/{post:slug}/sync-file', [PostController::class, 'destroySyncFile'])->name('destroySyncFile')->scopeBindings();
        Route::get('/{namespace}/{post:slug}/revisions', [PostController::class, 'revisions'])->name('revisions')->scopeBindings();
        Route::post('/{namespace}/{post:slug}/revisions/{revision}/restore', [PostController::class, 'restore'])->name('revisions.restore')->scopeBindings();
        Route::post('/{namespace}/{post:slug}/image', [PostController::class, 'uploadImage'])->name('uploadImage')->scopeBindings();
        Route::post('/{namespace}/{post:slug}/structure-markdown', [PostController::class, 'structureMarkdown'])->name('structureMarkdown')->scopeBindings();
        Route::post('/{namespace}/{post:slug}/translate-markdown', [PostController::class, 'translateMarkdown'])->name('translateMarkdown')->scopeBindings();
    });
});
