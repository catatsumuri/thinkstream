<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->foreignId('last_edited_by_user_id')
                ->nullable()
                ->after('user_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('thinkstream_pages', function (Blueprint $table) {
            $table->foreignId('last_edited_by_user_id')
                ->nullable()
                ->after('user_id')
                ->constrained('users')
                ->nullOnDelete();
        });

        Schema::table('thoughts', function (Blueprint $table) {
            $table->foreignId('last_edited_by_user_id')
                ->nullable()
                ->after('user_id')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('thoughts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('last_edited_by_user_id');
        });

        Schema::table('thinkstream_pages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('last_edited_by_user_id');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('last_edited_by_user_id');
        });
    }
};
