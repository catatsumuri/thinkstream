<?php

use App\Services\OgpMetadataService;
use Illuminate\Support\Facades\Cache;

test('invalid URL returns 422', function () {
    $response = $this->getJson('/api/ogp?url=not-a-url');

    $response->assertUnprocessable()
        ->assertJson(['error' => 'Invalid URL']);
});

test('url parameter is required', function () {
    $response = $this->getJson('/api/ogp');

    $response->assertUnprocessable()
        ->assertJson(['error' => 'Invalid URL']);
});

test('private network URLs are rejected', function () {
    $this->mock(OgpMetadataService::class)
        ->shouldReceive('isAllowedUrl')
        ->once()
        ->with('http://127.0.0.1/private')
        ->andReturnFalse()
        ->getMock()
        ->shouldNotReceive('fetch');

    $response = $this->getJson('/api/ogp?url='.urlencode('http://127.0.0.1/private'));

    $response->assertUnprocessable()
        ->assertJson(['error' => 'Invalid URL']);
});

test('returns 200 with metadata when OGP fetch succeeds', function () {
    $this->mock(OgpMetadataService::class)
        ->shouldReceive('isAllowedUrl')
        ->once()
        ->with('https://example.com')
        ->andReturnTrue()
        ->getMock()
        ->shouldReceive('fetch')
        ->once()
        ->andReturn([
            'title' => 'Example Site',
            'description' => 'An example website.',
            'image' => 'https://example.com/og.png',
            'url' => 'https://example.com',
        ]);

    $response = $this->getJson('/api/ogp?url='.urlencode('https://example.com'));

    $response->assertSuccessful()
        ->assertJson([
            'title' => 'Example Site',
            'description' => 'An example website.',
            'url' => 'https://example.com',
        ]);
});

test('returns 404 when OGP metadata cannot be fetched', function () {
    $this->mock(OgpMetadataService::class)
        ->shouldReceive('isAllowedUrl')
        ->once()
        ->with('https://example.com')
        ->andReturnTrue()
        ->getMock()
        ->shouldReceive('fetch')
        ->once()
        ->andReturn(null);

    $response = $this->getJson('/api/ogp?url='.urlencode('https://example.com'));

    $response->assertNotFound()
        ->assertJson(['error' => 'Failed to fetch OGP metadata']);
});

test('result is cached for 24 hours', function () {
    $url = 'https://example.com';

    $this->mock(OgpMetadataService::class)
        ->shouldReceive('isAllowedUrl')
        ->twice()
        ->with($url)
        ->andReturnTrue()
        ->getMock()
        ->shouldReceive('fetch')
        ->once() // called only once despite two requests
        ->andReturn([
            'title' => 'Cached Site',
            'description' => null,
            'image' => null,
            'url' => $url,
        ]);

    Cache::forget('ogp:'.md5($url));

    $this->getJson('/api/ogp?url='.urlencode($url))->assertStatus(200);
    $this->getJson('/api/ogp?url='.urlencode($url))->assertStatus(200);
});
