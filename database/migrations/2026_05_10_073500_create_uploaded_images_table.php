<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uploaded_images', function (Blueprint $table) {
            $table->id();
            $table->string('path');
            $table->string('disk')->default('public');
            $table->json('exif_data')->nullable();
            $table->timestamps();

            $table->index('path');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uploaded_images');
    }
};
