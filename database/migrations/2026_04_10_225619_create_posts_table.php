<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('namespace_id')->constrained('namespaces');
            $table->string('title');
            $table->string('slug');
            $table->string('full_path')->nullable()->unique();
            $table->longText('content');
            $table->unsignedBigInteger('page_views')->default(0);
            $table->boolean('is_draft')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->string('reference_title')->nullable();
            $table->string('reference_url', 2048)->nullable();
            $table->string('http_referer', 2048)->nullable();
            $table->boolean('is_syncing')->default(false);
            $table->string('sync_file_path')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();
            $table->unique(['namespace_id', 'slug']);
            $table->index('is_syncing');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
