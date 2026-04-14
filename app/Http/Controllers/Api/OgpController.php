<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OgpMetadataService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;

class OgpController extends Controller
{
    public function __construct(
        private OgpMetadataService $ogpService
    ) {}

    /**
     * Fetch OGP metadata for the given URL.
     */
    public function fetch(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'url' => [
                'required',
                'url:http,https',
                'max:2048',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || ! $this->ogpService->isAllowedUrl($value)) {
                        $fail("The {$attribute} field is invalid.");
                    }
                },
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid URL',
                'messages' => $validator->errors(),
            ], 422);
        }

        $url = $request->string('url')->toString();

        $metadata = Cache::remember('ogp:'.md5($url), now()->addHours(24), function () use ($url) {
            return $this->ogpService->fetch($url);
        });

        if (! $metadata) {
            return response()->json(['error' => 'Failed to fetch OGP metadata'], 404);
        }

        return response()->json($metadata);
    }
}
