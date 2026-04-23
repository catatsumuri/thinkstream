<?php

return [

    'private_mode' => (bool) env('THINKSTREAM_PRIVATE_MODE', false),

    'markdown_pages' => [
        'enabled' => (bool) env('THINKSTREAM_MARKDOWN_PAGES_ENABLED', false),
    ],

];
