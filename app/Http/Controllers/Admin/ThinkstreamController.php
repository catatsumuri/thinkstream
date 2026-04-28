<?php

namespace App\Http\Controllers\Admin;

use App\Ai\Agents\ThinkstreamStructureAgent;
use App\Ai\Agents\ThinkstreamTitleAgent;
use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\PostNamespace;
use App\Models\ThinkstreamPage;
use App\Models\Thought;
use App\Support\AiCostCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ThinkstreamController extends Controller
{
    public function index(Request $request): Response
    {
        $pages = ThinkstreamPage::query()
            ->whereBelongsTo($request->user())
            ->withCount('thoughts')
            ->latest()
            ->get(['id', 'user_id', 'title', 'created_at']);

        return Inertia::render('admin/thinkstream/index', [
            'pages' => $pages,
        ]);
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

    public function store(Request $request, ThinkstreamPage $page): RedirectResponse
    {
        $this->authorizePage($request, $page);

        $validated = $request->validate([
            'content' => ['required', 'string', 'max:10000'],
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
            'content' => ['required', 'string', 'max:10000'],
        ]);

        $thought->update($validated);

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

        $agentResponse = (new ThinkstreamStructureAgent)->prompt($combined);

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
