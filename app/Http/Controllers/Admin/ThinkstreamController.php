<?php

namespace App\Http\Controllers\Admin;

use App\Actions\ProcessUploadedImage;
use App\Ai\Agents\MarkdownStructureAgent;
use App\Ai\Agents\ThinkstreamStructureAgent;
use App\Ai\Agents\ThinkstreamTitleAgent;
use App\Ai\Agents\TranslateSelectionAgent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UploadImageRequest;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\ThinkstreamPage;
use App\Models\Thought;
use App\Support\AiCostCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use JsonException;
use Laravel\Ai\Files\Document;
use RuntimeException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\Yaml\Yaml;
use ZipArchive;

class ThinkstreamController extends Controller
{
    public function __construct(private readonly ProcessUploadedImage $processUploadedImage) {}

    public function index(Request $request): Response
    {
        $pages = ThinkstreamPage::query()
            ->whereBelongsTo($request->user())
            ->withCount('thoughts')
            ->latest()
            ->get(['id', 'user_id', 'title', 'created_at']);

        return Inertia::render('admin/thinkstream/index', [
            'pages' => $pages,
            'latest_backup' => $this->latestBackupInfo($request->user()->id),
        ]);
    }

    public function backup(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $description = trim((string) ($data['description'] ?? ''));

        $pages = ThinkstreamPage::query()
            ->whereBelongsTo($request->user())
            ->with('thoughts:id,page_id,content,created_at')
            ->orderBy('created_at')
            ->get();

        $dir = $this->backupDirectory();

        if (! File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        $path = $this->latestBackupPath($request->user()->id);

        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        $zip->addFromString('_backup.yaml', Yaml::dump([
            'description' => $description !== '' ? $description : null,
            'created_at' => now()->toIso8601String(),
            'page_count' => $pages->count(),
        ], 4));

        $zip->addFromString('thinkstream.json', (string) json_encode(
            $pages->map(fn (ThinkstreamPage $page): array => [
                'id' => $page->id,
                'title' => $page->title,
                'created_at' => $page->created_at->toIso8601String(),
                'thoughts' => $page->thoughts->map(fn (Thought $thought): array => [
                    'id' => $thought->id,
                    'content' => $thought->content,
                    'created_at' => $thought->created_at->toIso8601String(),
                ])->all(),
            ])->all(),
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
        ));

        $zip->close();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Backup created.']);

        return to_route('admin.thinkstream.index');
    }

    public function backupDownload(Request $request): BinaryFileResponse
    {
        $path = $this->latestBackupPath($request->user()->id);

        abort_unless(File::exists($path), 404);

        $filename = 'thinkstream-'.date('Ymd-His', File::lastModified($path)).'.zip';

        return response()->download($path, $filename);
    }

    public function backupRestore(Request $request): RedirectResponse
    {
        $path = $this->latestBackupPath($request->user()->id);

        abort_unless(File::exists($path), 404);

        $request->validate([
            'confirmation' => ['required', 'string', Rule::in(['restore'])],
        ]);

        try {
            $pages = $this->readBackupPages($path);
        } catch (RuntimeException) {
            throw ValidationException::withMessages([
                'backup' => 'The saved backup is not a valid Thinkstream backup.',
            ]);
        }

        $pageCount = $this->performRestore($request->user()->id, $pages);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Restored '.$pageCount.' canvas'.($pageCount === 1 ? '' : 'es').' from backup.']);

        return to_route('admin.thinkstream.index');
    }

    public function backupRestoreUpload(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'file' => ['required', 'file', 'extensions:zip', 'max:20480'],
            'confirmation' => ['required', 'string', Rule::in(['restore'])],
        ]);

        $tempPath = $data['file']->getRealPath();

        try {
            $pages = $this->readBackupPages($tempPath);
        } catch (RuntimeException) {
            throw ValidationException::withMessages([
                'file' => 'The uploaded file is not a valid Thinkstream backup.',
            ]);
        }

        $dir = $this->backupDirectory();

        if (! File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true);
        }

        $savedPath = $this->latestBackupPath($request->user()->id);
        if ($tempPath !== $savedPath) {
            File::copy($tempPath, $savedPath);
        }

        $pageCount = $this->performRestore($request->user()->id, $pages);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Restored '.$pageCount.' canvas'.($pageCount === 1 ? '' : 'es').' from uploaded backup.']);

        return to_route('admin.thinkstream.index');
    }

    /**
     * @param  array<int, array{title: string, created_at: string, thoughts: array<int, array{content: string, created_at: string}>}>  $pages
     */
    private function performRestore(int $userId, array $pages): int
    {
        return DB::transaction(function () use ($pages, $userId): int {
            ThinkstreamPage::where('user_id', $userId)->delete();

            foreach ($pages as $pageData) {
                $page = ThinkstreamPage::create([
                    'user_id' => $userId,
                    'title' => $pageData['title'],
                    'created_at' => $pageData['created_at'],
                    'updated_at' => $pageData['created_at'],
                ]);

                foreach ($pageData['thoughts'] as $thoughtData) {
                    Thought::create([
                        'user_id' => $userId,
                        'page_id' => $page->id,
                        'content' => $thoughtData['content'],
                        'created_at' => $thoughtData['created_at'],
                        'updated_at' => $thoughtData['created_at'],
                    ]);
                }
            }

            return count($pages);
        });
    }

    /**
     * @return array<int, array{title: string, created_at: string, thoughts: array<int, array{content: string, created_at: string}>}>
     */
    private function readBackupPages(string $zipPath): array
    {
        $zip = new ZipArchive;

        if ($zip->open($zipPath) !== true) {
            throw new RuntimeException('Unable to open Thinkstream backup archive.');
        }

        $json = $zip->getFromName('thinkstream.json');
        $zip->close();

        if (! is_string($json) || $json === '') {
            throw new RuntimeException('Missing thinkstream.json in Thinkstream backup archive.');
        }

        try {
            $pages = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $exception) {
            throw new RuntimeException('Malformed thinkstream.json in Thinkstream backup archive.', previous: $exception);
        }

        if (! is_array($pages)) {
            throw new RuntimeException('Invalid Thinkstream backup payload.');
        }

        return $pages;
    }

    private function backupDirectory(): string
    {
        return storage_path('app/private/thinkstream-backups');
    }

    private function latestBackupPath(int $userId): string
    {
        return $this->backupDirectory().'/thinkstream-'.$userId.'.zip';
    }

    /**
     * @return array{created_at: string, size_human: string, description: string|null, download_url: string}|null
     */
    private function latestBackupInfo(int $userId): ?array
    {
        $path = $this->latestBackupPath($userId);

        if (! File::exists($path)) {
            return null;
        }

        $zip = new ZipArchive;
        $description = null;

        if ($zip->open($path) === true) {
            $yaml = $zip->getFromName('_backup.yaml');

            if (is_string($yaml) && $yaml !== '') {
                $data = Yaml::parse($yaml);
                $description = is_array($data) ? ($data['description'] ?? null) : null;
            }

            $zip->close();
        }

        $bytes = File::size($path);
        $sizeHuman = match (true) {
            $bytes >= 1024 * 1024 => round($bytes / (1024 * 1024), 1).' MB',
            $bytes >= 1024 => round($bytes / 1024, 1).' KB',
            default => $bytes.' B',
        };

        return [
            'created_at' => date(DATE_ATOM, File::lastModified($path)),
            'size_human' => $sizeHuman,
            'description' => $description,
            'download_url' => route('admin.thinkstream.backup.download', absolute: false),
        ];
    }

    public function storePage(Request $request): RedirectResponse
    {
        $page = ThinkstreamPage::create([
            'user_id' => $request->user()->id,
            'title' => 'Canvas '.now()->format('Y-m-d H:i'),
        ]);

        return redirect()->route('admin.thinkstream.show', $page);
    }

    public function destroyPage(Request $request, ThinkstreamPage $page): RedirectResponse
    {
        $this->authorizePage($request, $page);

        $page->delete();

        return redirect()->route('admin.thinkstream.index');
    }

    public function show(Request $request, ThinkstreamPage $page): Response
    {
        $this->authorizePage($request, $page);

        $thoughts = $page->thoughts()
            ->with('user:id,name')
            ->oldest()
            ->get(['id', 'page_id', 'user_id', 'content', 'created_at']);

        return Inertia::render('admin/thinkstream/show', [
            'page' => $page->only('id', 'title', 'created_at'),
            'thoughts' => $thoughts,
            'aiEnabled' => config('thinkstream.ai.enabled'),
        ]);
    }

    public function uploadImage(UploadImageRequest $request, ThinkstreamPage $page): RedirectResponse
    {
        $this->authorizePage($request, $page);

        $uploadedImage = $this->processUploadedImage->handle(
            $request->file('image'),
            "thoughts/{$page->id}",
        );

        $imageUrl = '/images/'.$uploadedImage->path;

        return to_route('admin.thinkstream.show', $page)
            ->with('thoughtImageUrl', $imageUrl)
            ->with('thoughtImageUpload', [
                'key' => $request->string('upload_key')->toString(),
                'url' => $imageUrl,
            ]);
    }

    public function store(Request $request, ThinkstreamPage $page): RedirectResponse
    {
        $this->authorizePage($request, $page);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:200000'],
        ]);

        Thought::create([
            'user_id' => $request->user()->id,
            'page_id' => $page->id,
            'content' => $validated['content'],
        ]);

        return back();
    }

    public function update(Request $request, ThinkstreamPage $page, Thought $thought): RedirectResponse
    {
        $this->authorizeThought($request, $page, $thought);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:200000'],
        ]);

        $thought->update([...$validated, 'last_edited_by_user_id' => $request->user()->id]);

        return back();
    }

    public function destroyMany(Request $request, ThinkstreamPage $page): RedirectResponse
    {
        $this->authorizePage($request, $page);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        Thought::where('page_id', $page->id)
            ->whereIn('id', $validated['ids'])
            ->delete();

        return back();
    }

    public function structureThoughts(Request $request, ThinkstreamPage $page): JsonResponse
    {
        abort_unless(config('thinkstream.ai.enabled'), 403);
        $this->authorizePage($request, $page);

        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        $thoughts = Thought::where('page_id', $page->id)
            ->whereIn('id', $validated['ids'])
            ->oldest()
            ->get(['content']);

        $combined = implode("\n\n", [
            'Canvas title: '.$page->title,
            'Thoughts:',
            $thoughts->map(fn ($t) => $t->content)->join("\n\n---\n\n"),
        ]);
        $syntaxGuide = File::get(resource_path('ai/thinkstream-syntax-guide.md'));

        $agentResponse = (new ThinkstreamStructureAgent)->prompt(
            'Structure the attached thoughts into a coherent document.',
            attachments: [
                Document::fromString($combined, 'text/plain'),
                Document::fromString($syntaxGuide, 'text/markdown'),
            ],
        );

        $cost = AiCostCalculator::forText($agentResponse->meta, $agentResponse->usage);

        Log::info('Thinkstream thoughts structured with AI', [
            'page_id' => $page->id,
            'thought_ids' => $validated['ids'],
            'agent_model' => $agentResponse->meta->model,
            'agent_usage' => $agentResponse->usage->toArray(),
            'cost_usd' => $cost,
        ]);

        $message = $cost !== null
            ? __('Content structured. (cost: $:cost)', ['cost' => number_format($cost, 4)])
            : __('Content structured.');

        return response()->json([
            'title' => $agentResponse['title'],
            'content' => $agentResponse['content'],
            'message' => $message,
        ]);
    }

    public function structureThought(Request $request, ThinkstreamPage $page, Thought $thought): JsonResponse
    {
        abort_unless(config('thinkstream.ai.enabled'), 403);
        $this->authorizeThought($request, $page, $thought);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:200000'],
        ]);

        $agentResponse = (new MarkdownStructureAgent)->prompt($validated['content']);

        $cost = AiCostCalculator::forText($agentResponse->meta, $agentResponse->usage);

        Log::info('Thought structured with AI', [
            'page_id' => $page->id,
            'thought_id' => $thought->id,
            'agent_model' => $agentResponse->meta->model,
            'agent_usage' => $agentResponse->usage->toArray(),
            'cost_usd' => $cost,
        ]);

        $message = $cost !== null
            ? __('Content structured. (cost: $:cost)', ['cost' => number_format($cost, 4)])
            : __('Content structured.');

        return response()->json([
            'content' => $agentResponse['content'],
            'message' => $message,
        ]);
    }

    public function translateThought(Request $request, ThinkstreamPage $page, Thought $thought): JsonResponse
    {
        abort_unless(config('thinkstream.ai.enabled'), 403);
        $this->authorizeThought($request, $page, $thought);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:200000'],
        ]);

        $locale = (string) config('app.locale', 'en');
        $targetLanguage = \Locale::getDisplayLanguage($locale, 'en') ?: $locale;

        $agentResponse = (new TranslateSelectionAgent($targetLanguage))->prompt($validated['content']);

        $cost = AiCostCalculator::forText($agentResponse->meta, $agentResponse->usage);

        Log::info('Thought translated with AI', [
            'page_id' => $page->id,
            'thought_id' => $thought->id,
            'target_language' => $targetLanguage,
            'agent_model' => $agentResponse->meta->model,
            'agent_usage' => $agentResponse->usage->toArray(),
            'cost_usd' => $cost,
        ]);

        $message = $cost !== null
            ? __('Translated to :language. (cost: $:cost)', ['language' => $targetLanguage, 'cost' => number_format($cost, 4)])
            : __('Translated to :language.', ['language' => $targetLanguage]);

        return response()->json([
            'content' => $agentResponse['content'],
            'message' => $message,
        ]);
    }

    public function updateTitle(Request $request, ThinkstreamPage $page): JsonResponse
    {
        $this->authorizePage($request, $page);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $page->update(['title' => $validated['title'], 'last_edited_by_user_id' => $request->user()->id]);

        return response()->json(['title' => $page->title]);
    }

    public function refineTitle(Request $request, ThinkstreamPage $page): JsonResponse
    {
        abort_unless(config('thinkstream.ai.enabled'), 403);
        $this->authorizePage($request, $page);

        $thoughts = $page->thoughts()
            ->oldest()
            ->get(['content']);

        if ($thoughts->isEmpty()) {
            throw ValidationException::withMessages([
                'page' => __('Add at least one thought before refining the title.'),
            ]);
        }

        $prompt = implode("\n\n", [
            'Current title: '.$page->title,
            'Thoughts:',
            $thoughts->pluck('content')->join("\n\n---\n\n"),
        ]);

        $agentResponse = (new ThinkstreamTitleAgent)->prompt($prompt);

        $page->update([
            'title' => $agentResponse['title'],
        ]);

        $cost = AiCostCalculator::forText($agentResponse->meta, $agentResponse->usage);

        Log::info('Thinkstream title refined with AI', [
            'page_id' => $page->id,
            'thought_count' => $thoughts->count(),
            'agent_model' => $agentResponse->meta->model,
            'agent_usage' => $agentResponse->usage->toArray(),
            'cost_usd' => $cost,
        ]);

        $message = $cost !== null
            ? __('Title refined. (cost: $:cost)', ['cost' => number_format($cost, 4)])
            : __('Title refined.');

        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return response()->json([
            'title' => $page->title,
        ]);
    }

    public function saveToScrap(Request $request): JsonResponse
    {
        abort_unless(config('thinkstream.ai.enabled'), 403);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:200000'],
            'title' => ['nullable', 'string', 'max:255'],
            'delete_canvas' => ['required', 'boolean'],
            'page_id' => [
                Rule::requiredIf(fn () => (bool) $request->boolean('delete_canvas')),
                'nullable',
                'integer',
                'exists:thinkstream_pages,id',
            ],
        ]);

        $page = null;

        if ($validated['delete_canvas']) {
            $page = ThinkstreamPage::findOrFail($validated['page_id']);

            $this->authorizePage($request, $page);
        }

        $scrap = PostNamespace::where('slug', 'scrap')->firstOrFail();

        $title = $validated['title'] ?? null;

        if (empty($title)) {
            preg_match('/^#\s+(.+)$/m', $validated['content'], $matches);
            $title = $matches[1] ?? null;
        }

        if (empty($title)) {
            $title = 'Scrap '.now()->format('Y-m-d H:i');
        }

        $content = $this->stripLeadingTitleHeading($validated['content'], $title);

        $dateSuffix = now()->format('Ymd');
        $base = Str::slug($title);
        $base = $base !== '' ? "{$base}-{$dateSuffix}" : "scrap-{$dateSuffix}";
        $slug = $base;
        $counter = 2;

        while (Post::where('namespace_id', $scrap->id)->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$counter++;
        }

        $post = Post::create([
            'namespace_id' => $scrap->id,
            'user_id' => $request->user()->id,
            'title' => $title,
            'slug' => $slug,
            'content' => $content,
            'is_draft' => true,
        ]);

        if ($page !== null) {
            $page->delete();
        }

        return response()->json([
            'url' => route('admin.posts.show', ['namespace' => $scrap, 'post' => $post->slug]),
        ]);
    }

    private function stripLeadingTitleHeading(string $content, string $title): string
    {
        $trimmedContent = ltrim($content);
        $escapedTitle = preg_quote(trim($title), '/');

        $strippedContent = preg_replace(
            "/^#\\s+{$escapedTitle}\\s*\\n+(.*)$/s",
            '$1',
            $trimmedContent,
        );

        if (! is_string($strippedContent)) {
            return $content;
        }

        $strippedContent = ltrim($strippedContent);

        return $strippedContent !== '' ? $strippedContent : $content;
    }

    private function authorizePage(Request $request, ThinkstreamPage $page): void
    {
        abort_unless($page->user_id === $request->user()->id, 403);
    }

    private function authorizeThought(Request $request, ThinkstreamPage $page, Thought $thought): void
    {
        $this->authorizePage($request, $page);

        abort_if(
            $thought->page_id !== $page->id || $thought->user_id !== $request->user()->id,
            403,
        );
    }
}
