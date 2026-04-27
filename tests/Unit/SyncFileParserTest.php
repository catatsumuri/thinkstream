<?php

use App\Services\SyncFileParser;

beforeEach(function () {
    $this->parser = new SyncFileParser;
    $this->tmpDir = sys_get_temp_dir().'/sync_parser_test_'.uniqid();
    mkdir($this->tmpDir);
});

afterEach(function () {
    array_map('unlink', glob($this->tmpDir.'/*') ?: []);
    rmdir($this->tmpDir);
});

function parserTmpFile(string $dir, string $content): string
{
    $path = $dir.'/test.md';
    file_put_contents($path, $content);

    return $path;
}

test('parses title and content from frontmatter', function () {
    $path = parserTmpFile($this->tmpDir, "---\ntitle: Hello World\n---\n\nPost body here.");

    $result = $this->parser->parse($path);

    expect($result['title'])->toBe('Hello World')
        ->and($result['content'])->toBe('Post body here.');
});

test('parses tags from frontmatter', function () {
    $path = parserTmpFile($this->tmpDir, "---\ntitle: Tagged Post\ntags: [php, laravel]\n---\n\nContent.");

    $result = $this->parser->parse($path);

    expect($result['tags'])->toBe(['php', 'laravel']);
});

test('returns empty tags when not specified', function () {
    $path = parserTmpFile($this->tmpDir, "---\ntitle: No Tags\n---\n\nContent.");

    $result = $this->parser->parse($path);

    expect($result['tags'])->toBe([]);
});

test('returns null title when not specified in frontmatter', function () {
    $path = parserTmpFile($this->tmpDir, "---\ntags: [php]\n---\n\nContent.");

    $result = $this->parser->parse($path);

    expect($result['title'])->toBeNull();
});

test('returns raw content when no frontmatter present', function () {
    $content = "# Just markdown\n\nNo frontmatter here.";
    $path = parserTmpFile($this->tmpDir, $content);

    $result = $this->parser->parse($path);

    expect($result['title'])->toBeNull()
        ->and($result['tags'])->toBe([])
        ->and($result['content'])->toBe($content);
});

test('handles empty content after frontmatter', function () {
    $path = parserTmpFile($this->tmpDir, "---\ntitle: Empty Body\n---\n\n");

    $result = $this->parser->parse($path);

    expect($result['title'])->toBe('Empty Body')
        ->and($result['content'])->toBe('');
});

test('throws when the file cannot be read', function () {
    expect(fn () => $this->parser->parse($this->tmpDir.'/missing.md'))
        ->toThrow(RuntimeException::class, 'Unable to read sync file');
});
