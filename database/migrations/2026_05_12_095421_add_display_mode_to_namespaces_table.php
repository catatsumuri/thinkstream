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
        if (Schema::hasColumn('namespaces', 'display_mode')) {
            return;
        }

        Schema::table('namespaces', function (Blueprint $table): void {
            $table->string('display_mode')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('namespaces', 'display_mode')) {
            return;
        }

        Schema::table('namespaces', function (Blueprint $table): void {
            $table->dropColumn('display_mode');
        });
    }
};
