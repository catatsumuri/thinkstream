<?php

return [

    'private_mode' => (bool) env('THINKSTREAM_PRIVATE_MODE', false),

    'markdown_pages' => [
        'enabled' => (bool) env('THINKSTREAM_MARKDOWN_PAGES_ENABLED', false),
    ],

    'backup' => [
        'directory' => env('THINKSTREAM_BACKUP_DIR', storage_path('app/private/backups')),
    ],

    'sync' => [
        'directory' => env('THINKSTREAM_SYNC_DIR', storage_path('app/private/sync')),
        'poll_interval' => (int) env('THINKSTREAM_SYNC_POLL_INTERVAL', 1),
    ],

    'ai' => [
        'enabled' => (bool) env('THINKSTREAM_AI_ENABLED', false),
    ],

];
