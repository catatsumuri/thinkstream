<?php

test('no Japanese characters exist in frontend source files', function () {
    $jsDir = dirname(__DIR__, 2).'/resources/js';
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($jsDir, FilesystemIterator::SKIP_DOTS),
    );

    $violations = [];

    foreach ($files as $file) {
        if (! in_array($file->getExtension(), ['tsx', 'ts', 'jsx', 'js'])) {
            continue;
        }

        $lines = file($file->getRealPath(), FILE_IGNORE_NEW_LINES);
        foreach ($lines as $lineNumber => $line) {
            if (preg_match('/[\x{3040}-\x{309F}\x{30A0}-\x{30FF}\x{4E00}-\x{9FFF}\x{3400}-\x{4DBF}\x{FF00}-\x{FFEF}]/u', $line)) {
                $relativePath = str_replace(dirname(__DIR__, 2).'/', '', $file->getRealPath());
                $violations[] = "{$relativePath}:".($lineNumber + 1).": {$line}";
            }
        }
    }

    expect($violations)->toBeEmpty(
        "Japanese characters found in frontend source files:\n".implode("\n", $violations),
    );
});
