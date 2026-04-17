<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('namespaces', function (Blueprint $table) {
            $table->dropUnique('namespaces_slug_unique');
        });
    }

    public function down(): void
    {
        Schema::table('namespaces', function (Blueprint $table) {
            $table->unique('slug');
        });
    }
};
