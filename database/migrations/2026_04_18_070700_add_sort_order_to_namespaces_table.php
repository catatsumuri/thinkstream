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
        Schema::table('namespaces', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('namespaces', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
