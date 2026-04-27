<?php

namespace App\Console\Commands;

use App\Models\Post;
use App\Models\Tag;
use App\Services\SyncFileParser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Finder\Finder;

class SyncWatchCommand extends Command
{
    protected $signature = 'sync:watch
                             {--once : Process sync state once and exit instead of looping}';

    protected $description = 'Watch the sync directory and keep posts in sync with local files';

    protected $help = <<<'HELP'
Polls THINKSTREAM_SYNC_DIR (default: storage/app/private/sync) and syncs .md
files to existing posts by matching file paths to post full_path values.

Only posts that already exist in the database are synced. New files do not
create new posts or namespaces — a post must be created via the web UI first.

File format: YAML frontmatter (title, tags) followed by a Markdown body.

  ---
  title: My Post
  tags: [php, laravel]
  ---

  Content goes here.

Workflow:
  1. Open a post in the admin and click "Start Sync" on the show page.
     This writes the post's content to SYNC_DIR/{full_path}.md and enables
     sync mode. Web editing is disabled while sync mode is active.
  2. Run this command to watch for changes:
       vendor/bin/sail artisan sync:watch
  3. Edit the local .md file. Changes are picked up on the next poll cycle.
  4. To stop syncing, click "Remove sync file" on the show page, or delete
     the file from the sync directory. The next poll will disable sync mode.
HELP;

    private bool $shouldStop = false;

    public function handle(SyncFileParser $parser): int
    {
        $syncDir = config('thinkstream.sync.directory');

        if (! $syncDir) {
            $this->error('THINKSTREAM_SYNC_DIR is not configured. Set it in your .env file.');

            return self::FAILURE;
        }

        $syncDir = rtrim((string) $syncDir, '/');

        if (! is_dir($syncDir)) {
            mkdir($syncDir, 0755, true);
            $this->line("Created sync directory: {$syncDir}");
        }

        $this->trap([SIGINT, SIGTERM], function (): void {
            $this->shouldStop = true;
        });

        $interval = (int) config('thinkstream.sync.poll_interval', 1);
        $once = (bool) $this->option('once');

        $this->info("Watching {$syncDir} (polling every {$interval}s) …");

        do {
            $this->poll($syncDir, $parser);

            if (! $once && ! $this->shouldStop) {
                sleep($interval);
            }
        } while (! $once && ! $this->shouldStop);

        $this->info('Stopped.');

        return self::SUCCESS;
    }

    private function poll(string $syncDir, SyncFileParser $parser): void
    {
        $foundPaths = [];

        $finder = (new Finder)->files()->in($syncDir);

        foreach ($finder as $file) {
            $relativePath = ltrim($file->getRelativePathname(), '/');
            $lookupPath = str_ends_with($relativePath, '.md') ? substr($relativePath, 0, -3) : $relativePath;
            $foundPaths[$lookupPath] = $file->getRealPath();
        }

        foreach ($foundPaths as $relativePath => $absolutePath) {
            $post = Post::where('full_path', $relativePath)->first();

            if (! $post) {
                continue;
            }

            $mtime = filemtime($absolutePath);

            if ($mtime === false) {
                $this->warn("Skipping unreadable sync file: {$relativePath}");

                Log::warning('sync:watch skipped unreadable sync file', [
                    'full_path' => $relativePath,
                    'post_id' => $post->id,
                ]);

                continue;
            }

            $lastSynced = $post->last_synced_at?->getTimestamp();

            $fileChanged = $lastSynced === null || $mtime > $lastSynced;

            if (! $post->is_syncing || $fileChanged) {
                $this->applyFileToPost($post, $absolutePath, $relativePath, $parser);
            }
        }

        Post::where('is_syncing', true)->each(function (Post $post) use ($foundPaths): void {
            if (! isset($foundPaths[$post->full_path])) {
                $this->disableSyncMode($post);
            }
        });
    }

    private function applyFileToPost(Post $post, string $absolutePath, string $relativePath, SyncFileParser $parser): void
    {
        try {
            $parsed = $parser->parse($absolutePath);
        } catch (RuntimeException $exception) {
            $this->warn("Skipping unreadable sync file: {$relativePath}");

            Log::warning('sync:watch skipped unreadable sync file', [
                'full_path' => $relativePath,
                'post_id' => $post->id,
                'exception' => $exception->getMessage(),
            ]);

            return;
        }

        $newTitle = $parsed['title'] ?? $post->title;
        $newContent = $parsed['content'];

        $hasChanges = ! $post->is_syncing
            || $post->title !== $newTitle
            || $post->content !== $newContent;

        if ($hasChanges && $post->is_syncing) {
            $post->revisions()->create([
                'user_id' => null,
                'title' => $post->title,
                'content' => $post->content,
            ]);
        }

        $post->forceFill([
            'is_syncing' => true,
            'sync_file_path' => $absolutePath,
            'last_synced_at' => now(),
            'title' => $newTitle,
            'content' => $newContent,
        ])->saveQuietly();

        $this->syncTags($post, $parsed['tags']);

        $this->line("Synced: {$relativePath}");

        Log::info('sync:watch synced post', ['full_path' => $relativePath, 'post_id' => $post->id]);
    }

    private function disableSyncMode(Post $post): void
    {
        $post->forceFill([
            'is_syncing' => false,
            'sync_file_path' => null,
            'last_synced_at' => null,
        ])->saveQuietly();

        $this->line("Sync ended: {$post->full_path}");

        Log::info('sync:watch ended sync for post', ['full_path' => $post->full_path, 'post_id' => $post->id]);
    }

    /**
     * @param  string[]  $rawTags
     */
    private function syncTags(Post $post, array $rawTags): void
    {
        $tagIds = collect($rawTags)
            ->map(fn (string $t) => mb_strtolower(trim($t)))
            ->filter(fn (string $t) => $t !== '')
            ->unique()
            ->map(fn (string $name) => Tag::firstOrCreate(['name' => $name])->id)
            ->all();

        $post->tags()->sync($tagIds);
    }
}
