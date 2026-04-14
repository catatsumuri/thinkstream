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
            $table->longText('content');
            $table->boolean('is_draft')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->unique(['namespace_id', 'slug']);
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
