<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_referrers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->string('http_referer', 2048);
            $table->string('referrer_host', 2048);
            $table->unsignedInteger('count')->default(1);
            $table->timestamp('last_seen_at')->nullable();

            $table->unique(['post_id', 'http_referer']);
            $table->index('referrer_host');
        });

        $this->backfillLegacyReferrers();

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('http_referer');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('http_referer', 2048)->nullable();
        });

        $this->restoreLegacyReferrers();

        Schema::dropIfExists('post_referrers');
    }

    private function backfillLegacyReferrers(): void
    {
        DB::table('posts')
            ->select(['id', 'http_referer'])
            ->whereNotNull('http_referer')
            ->where('http_referer', '!=', '')
            ->orderBy('id')
            ->chunkById(100, function ($posts): void {
                $rows = $posts
                    ->map(fn (object $post): array => [
                        'post_id' => $post->id,
                        'http_referer' => $post->http_referer,
                        'referrer_host' => $this->resolveReferrerHost($post->http_referer),
                        'count' => 1,
                        'last_seen_at' => null,
                    ])
                    ->all();

                if ($rows !== []) {
                    DB::table('post_referrers')->insert($rows);
                }
            });
    }

    private function restoreLegacyReferrers(): void
    {
        $restoredPostId = null;

        foreach (
            DB::table('post_referrers')
                ->select(['id', 'post_id', 'http_referer', 'count'])
                ->orderBy('post_id')
                ->orderByDesc('count')
                ->orderByDesc('id')
                ->cursor() as $referrer
        ) {
            if ($referrer->post_id === $restoredPostId) {
                continue;
            }

            DB::table('posts')
                ->where('id', $referrer->post_id)
                ->update(['http_referer' => $referrer->http_referer]);

            $restoredPostId = $referrer->post_id;
        }
    }

    private function resolveReferrerHost(string $url): string
    {
        $host = parse_url($url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? $host : $url;
    }
};
