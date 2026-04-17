<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('namespaces', function (Blueprint $table) {
            $table->foreignId('parent_id')
                ->nullable()
                ->after('id')
                ->constrained('namespaces')
                ->cascadeOnDelete();
            $table->string('full_path')->nullable()->after('slug')->unique();
            $table->index('parent_id');
        });

        DB::table('namespaces')
            ->orderBy('id')
            ->get(['id', 'slug'])
            ->each(function (object $namespace): void {
                DB::table('namespaces')
                    ->where('id', $namespace->id)
                    ->update(['full_path' => $namespace->slug]);
            });

        Schema::table('posts', function (Blueprint $table) {
            $table->string('full_path')->nullable()->after('slug')->unique();
        });

        DB::table('posts')
            ->orderBy('id')
            ->get(['id', 'namespace_id', 'slug'])
            ->each(function (object $post): void {
                $namespacePath = DB::table('namespaces')
                    ->where('id', $post->namespace_id)
                    ->value('full_path');

                DB::table('posts')
                    ->where('id', $post->id)
                    ->update([
                        'full_path' => trim(implode('/', array_filter([$namespacePath, $post->slug])), '/'),
                    ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropUnique('posts_full_path_unique');
            $table->dropColumn('full_path');
        });

        Schema::table('namespaces', function (Blueprint $table) {
            $table->dropUnique('namespaces_full_path_unique');
            $table->dropForeign(['parent_id']);
            $table->dropIndex('namespaces_parent_id_index');
            $table->dropColumn(['parent_id', 'full_path']);
        });
    }
};
